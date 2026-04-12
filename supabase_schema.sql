SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";
COMMENT ON SCHEMA "public" IS 'standard public schema';
CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";

CREATE OR REPLACE FUNCTION "public"."add_admin"("target_email" "text") RETURNS json LANGUAGE "plpgsql" SECURITY DEFINER AS $$
declare
  target_id uuid;
  admin_count integer;
  current_user_super boolean;
begin
  select is_super_admin into current_user_super from profiles where id = auth.uid();
  if coalesce(current_user_super, false) is not true then
    return json_build_object('success', false, 'message', 'Only Super Admins can add admins.');
  end if;
  select count(*) into admin_count from profiles where is_admin = true and is_super_admin = false;
  if admin_count >= 2 then
    return json_build_object('success', false, 'message', 'Maximum limit of 2 additional admins reached.');
  end if;
  select id into target_id from profiles where email = target_email;
  if target_id is null then
    return json_build_object('success', false, 'message', 'User with this email not found.');
  end if;
  update profiles set is_admin = true where id = target_id;
  return json_build_object('success', true, 'message', 'Admin added successfully.');
end;
$$;
ALTER FUNCTION "public"."add_admin"("target_email" "text") OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."check_wishlist_limit"() RETURNS "trigger" LANGUAGE "plpgsql" AS $$
DECLARE item_count integer;
BEGIN
  SELECT count(*) INTO item_count FROM wishlist WHERE user_id = new.user_id;
  IF item_count >= 5 THEN
    RAISE EXCEPTION 'Wishlist limit reached. You can only add up to 5 items.';
  END IF;
  RETURN new;
END;
$$;
ALTER FUNCTION "public"."check_wishlist_limit"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."delete_user_account"() RETURNS json LANGUAGE "plpgsql" SECURITY DEFINER SET search_path = 'public' AS $$
DECLARE
  user_id uuid;
  user_email text;
BEGIN
  user_id := auth.uid();
  
  IF user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Not authenticated');
  END IF;
  
  -- Get the email before we delete
  SELECT email INTO user_email FROM auth.users WHERE id = user_id;
  
  IF user_email IS NOT NULL THEN
    -- Anonymize profile data (soft delete)
    UPDATE "public"."profiles"
    SET 
      email = NULL,
      username = 'Deleted User',
      phone = NULL,
      address = NULL,
      deleted_at = timezone('utc'::text, now())
    WHERE id = user_id;
    
    -- Delete wishlist items
    DELETE FROM "public"."wishlist" WHERE user_id = user_id;
    
    -- Log the deletion for rate limiting
    INSERT INTO "public"."signup_rate_limit" (email, can_retry_at)
    VALUES (user_email, timezone('utc'::text, now()) + INTERVAL '15 minutes')
    ON CONFLICT (email) DO UPDATE SET 
      can_retry_at = timezone('utc'::text, now()) + INTERVAL '15 minutes',
      deleted_at = timezone('utc'::text, now());
  END IF;
  
  -- Delete from auth.users - this will cascade to profiles
  DELETE FROM auth.users WHERE id = user_id;
  
  RETURN json_build_object('success', true, 'message', 'Account deleted successfully');
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;
ALTER FUNCTION "public"."delete_user_account"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger" LANGUAGE "plpgsql" SECURITY DEFINER AS $$
DECLARE
  raw_full_name text;
  raw_first_name text;
  raw_last_name text;
  is_first_user boolean;
BEGIN
  SELECT count(*) = 0 INTO is_first_user FROM public.profiles;
  raw_full_name := new.raw_user_meta_data ->> 'full_name';
  raw_first_name := new.raw_user_meta_data ->> 'first_name';
  raw_last_name := new.raw_user_meta_data ->> 'last_name';
  IF raw_first_name IS NULL THEN
    IF raw_full_name IS NOT NULL THEN
      raw_first_name := split_part(raw_full_name, ' ', 1);
      raw_last_name := split_part(raw_full_name, ' ', 2);
    ELSE
      raw_first_name := split_part(new.email, '@', 1);
    END IF;
  END IF;
  INSERT INTO public.profiles (id, email, username, is_admin, is_super_admin)
  VALUES (
    new.id,
    new.email,
    COALESCE(raw_full_name, raw_first_name || ' ' || COALESCE(raw_last_name, ''), split_part(new.email, '@', 1)),
    is_first_user,
    is_first_user
  );
  RETURN new;
END;
$$;
ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."check_signup_rate_limit"("user_email" "text") RETURNS json LANGUAGE "plpgsql" SECURITY DEFINER AS $$
DECLARE
  rate_limit_record RECORD;
  minutes_remaining integer;
BEGIN
  SELECT * INTO rate_limit_record FROM "public"."signup_rate_limit"
  WHERE email = user_email AND can_retry_at > timezone('utc'::text, now());
  
  IF rate_limit_record IS NOT NULL THEN
    minutes_remaining := EXTRACT(EPOCH FROM (rate_limit_record.can_retry_at - timezone('utc'::text, now()))) / 60;
    RETURN json_build_object(
      'allowed', false,
      'message', 'This account was recently deleted. Please wait ' || CEILING(minutes_remaining) || ' minutes before signing up again.',
      'minutes_remaining', CEILING(minutes_remaining)
    );
  END IF;
  
  RETURN json_build_object('allowed', true, 'message', 'Signup allowed');
END;
$$;
ALTER FUNCTION "public"."check_signup_rate_limit"("user_email" "text") OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."remove_admin"("target_id" "uuid") RETURNS json LANGUAGE "plpgsql" SECURITY DEFINER AS $$
declare
  current_user_super boolean;
  target_super boolean;
begin
  select is_super_admin into current_user_super from profiles where id = auth.uid();
  if coalesce(current_user_super, false) is not true then
    return json_build_object('success', false, 'message', 'Only Super Admins can remove admins.');
  end if;
  select is_super_admin into target_super from profiles where id = target_id;
  if target_super then
    return json_build_object('success', false, 'message', 'Cannot remove Super Admin access.');
  end if;
  update profiles set is_admin = false where id = target_id;
  return json_build_object('success', true, 'message', 'Admin removed successfully.');
end;
$$;
ALTER FUNCTION "public"."remove_admin"("target_id" "uuid") OWNER TO "postgres";

SET default_tablespace = '';
SET default_table_access_method = "heap";

CREATE TABLE IF NOT EXISTS "public"."messages" (
  "id" bigint NOT NULL,
  "customer_name" text NOT NULL,
  "customer_email" text NOT NULL,
  "message_type" text NOT NULL,
  "message_body" text NOT NULL,
  "status" text DEFAULT 'new'::text,
  "admin_reply" text,
  "replied_at" timestamp with time zone,
  "admin_notes" text,
  "created_at" timestamp with time zone DEFAULT now(),
  CONSTRAINT "messages_message_type_check" CHECK (message_type = ANY (ARRAY['General Inquiry'::text, 'Product Question'::text, 'Order Status'::text, 'Custom Design'::text, 'Feedback'::text, 'Other'::text])),
  CONSTRAINT "messages_status_check" CHECK (status = ANY (ARRAY['new'::text, 'read'::text, 'replied'::text, 'archived'::text]))
);
ALTER TABLE "public"."messages" OWNER TO "postgres";
ALTER TABLE "public"."messages" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (SEQUENCE NAME "public"."messages_id_seq" START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1);

CREATE TABLE IF NOT EXISTS "public"."order_items" (
  "id" bigint NOT NULL,
  "order_id" bigint,
  "product_id" bigint,
  "quantity" integer DEFAULT 1,
  "price_at_purchase" numeric NOT NULL
);
ALTER TABLE "public"."order_items" OWNER TO "postgres";
ALTER TABLE "public"."order_items" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (SEQUENCE NAME "public"."order_items_id_seq" START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1);

CREATE TABLE IF NOT EXISTS "public"."orders" (
  "id" bigint NOT NULL,
  "user_id" uuid,
  "total_amount" numeric NOT NULL,
  "status" text DEFAULT 'pending'::text,
  "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  "address" text,
  "shipping_address" text,
  "delivery_address" text,
  "payment_method" text DEFAULT 'cash_on_delivery'::text,
  "transaction_id" text,
  "sender_number" text,
  "order_status" text DEFAULT 'pending_verification'::text,
  CONSTRAINT "orders_payment_method_check" CHECK (payment_method = ANY (ARRAY['bkash'::text, 'nagad'::text, 'cash_on_delivery'::text])),
  CONSTRAINT "orders_order_status_check" CHECK (order_status = ANY (ARRAY['pending_verification'::text, 'payment_verified'::text, 'processing'::text, 'delivered'::text, 'rejected'::text]))
);
ALTER TABLE "public"."orders" OWNER TO "postgres";
ALTER TABLE "public"."orders" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (SEQUENCE NAME "public"."orders_id_seq" START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1);

CREATE TABLE IF NOT EXISTS "public"."products" (
  "id" bigint NOT NULL,
  "name" text NOT NULL,
  "category" text NOT NULL,
  "price" numeric NOT NULL,
  "image_url" text NOT NULL,
  "featured" boolean DEFAULT false,
  "description" text,
  "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  "stock_status" text DEFAULT 'in_stock'::text,
  "stock_quantity" integer DEFAULT 1,
  "updated_at" timestamp with time zone DEFAULT now()
);
ALTER TABLE "public"."products" OWNER TO "postgres";
ALTER TABLE "public"."products" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (SEQUENCE NAME "public"."products_id_seq" START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1);

CREATE TABLE IF NOT EXISTS "public"."profiles" (
  "id" uuid NOT NULL,
  "email" text,
  "username" text,
  "is_admin" boolean DEFAULT false,
  "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  "address" text,
  "phone" text,
  "is_super_admin" boolean DEFAULT false,
  "deleted_at" timestamp with time zone
);
ALTER TABLE "public"."profiles" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."wishlist" (
  "id" bigint NOT NULL,
  "user_id" uuid NOT NULL,
  "product_id" bigint NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "public"."wishlist" OWNER TO "postgres";
ALTER TABLE "public"."wishlist" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (SEQUENCE NAME "public"."wishlist_id_seq" START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1);

CREATE TABLE IF NOT EXISTS "public"."signup_rate_limit" (
  "id" bigint NOT NULL,
  "email" text NOT NULL,
  "deleted_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  "can_retry_at" timestamp with time zone NOT NULL
);
ALTER TABLE "public"."signup_rate_limit" OWNER TO "postgres";
ALTER TABLE "public"."signup_rate_limit" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (SEQUENCE NAME "public"."signup_rate_limit_id_seq" START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1);
ALTER TABLE ONLY "public"."signup_rate_limit" ADD CONSTRAINT "signup_rate_limit_pkey" PRIMARY KEY ("id");
CREATE UNIQUE INDEX "signup_rate_limit_email_idx" ON "public"."signup_rate_limit" USING btree ("email");

ALTER TABLE ONLY "public"."messages" ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."order_items" ADD CONSTRAINT "order_items_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."orders" ADD CONSTRAINT "orders_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."products" ADD CONSTRAINT "products_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."profiles" ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."wishlist" ADD CONSTRAINT "wishlist_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."wishlist" ADD CONSTRAINT "wishlist_user_id_product_id_key" UNIQUE ("user_id", "product_id");

CREATE INDEX "idx_messages_created_at" ON "public"."messages" USING btree ("created_at" DESC);
CREATE INDEX "idx_messages_status" ON "public"."messages" USING btree ("status");
CREATE INDEX "idx_orders_payment_method" ON "public"."orders" USING btree ("payment_method");
CREATE INDEX "idx_orders_order_status" ON "public"."orders" USING btree ("order_status");
CREATE INDEX "idx_orders_status" ON "public"."orders" USING btree ("status");

CREATE OR REPLACE TRIGGER "enforce_wishlist_limit" BEFORE INSERT ON "public"."wishlist" FOR EACH ROW EXECUTE FUNCTION "public"."check_wishlist_limit"();

-- NOTE: on_new_message trigger omitted intentionally.
-- It calls a Supabase Edge Function with a service role key.
-- Configure this trigger manually in the Supabase dashboard.

ALTER TABLE ONLY "public"."order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."order_items" ADD CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id");
ALTER TABLE ONLY "public"."orders" ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;
ALTER TABLE ONLY "public"."profiles" ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."wishlist" ADD CONSTRAINT "wishlist_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."wishlist" ADD CONSTRAINT "wishlist_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;

CREATE POLICY "Admins can delete products" ON "public"."products" FOR DELETE USING ((EXISTS (SELECT 1 FROM "public"."profiles" WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."is_admin" = true)))));
CREATE POLICY "Admins can insert products" ON "public"."products" FOR INSERT WITH CHECK ((EXISTS (SELECT 1 FROM "public"."profiles" WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."is_admin" = true)))));
CREATE POLICY "Admins can update messages" ON "public"."messages" FOR UPDATE TO "authenticated" USING ((EXISTS (SELECT 1 FROM "public"."profiles" WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."is_admin" = true)))));
CREATE POLICY "Admins can update products" ON "public"."products" FOR UPDATE USING ((EXISTS (SELECT 1 FROM "public"."profiles" WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."is_admin" = true)))));
CREATE POLICY "Admins can view all messages" ON "public"."messages" FOR SELECT TO "authenticated" USING ((EXISTS (SELECT 1 FROM "public"."profiles" WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."is_admin" = true)))));
CREATE POLICY "Admins can view all order items" ON "public"."order_items" FOR SELECT USING ((EXISTS (SELECT 1 FROM "public"."profiles" WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."is_admin" = true)))));
CREATE POLICY "Admins can view all orders" ON "public"."orders" FOR SELECT USING ((EXISTS (SELECT 1 FROM "public"."profiles" WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."is_admin" = true)))));
CREATE POLICY "Admins can update orders" ON "public"."orders" FOR UPDATE USING ((EXISTS (SELECT 1 FROM "public"."profiles" WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."is_admin" = true))))) WITH CHECK ((EXISTS (SELECT 1 FROM "public"."profiles" WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."is_admin" = true)))));
CREATE POLICY "Anyone can submit a message" ON "public"."messages" FOR INSERT TO "authenticated", "anon" WITH CHECK (true);
CREATE POLICY "Products are viewable by everyone" ON "public"."products" FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can view own profile and admins view all" ON "public"."profiles";
CREATE POLICY "Users can view own profile and admins view all" ON "public"."profiles" FOR SELECT USING ((("auth"."uid"() = "id" AND "deleted_at" IS NULL) OR (EXISTS (SELECT 1 FROM "public"."profiles" "profiles_1" WHERE (("profiles_1"."id" = "auth"."uid"()) AND ("profiles_1"."is_admin" = true))))));
DROP POLICY IF EXISTS "Super Admins can update any profile" ON "public"."profiles";
CREATE POLICY "Super Admins can update any profile" ON "public"."profiles" FOR UPDATE USING ((EXISTS (SELECT 1 FROM "public"."profiles" "profiles_1" WHERE (("profiles_1"."id" = "auth"."uid"()) AND ("profiles_1"."is_super_admin" = true) AND ("profiles_1"."deleted_at" IS NULL)))));
DROP POLICY IF EXISTS "Users can insert their own profile" ON "public"."profiles";
DROP POLICY IF EXISTS "Users can update own profile" ON "public"."profiles";

CREATE POLICY "Users can insert their own profile" ON "public"."profiles"
  FOR INSERT TO "authenticated"
  WITH CHECK (
    ("auth"."uid"() = "id")
    AND ("is_admin" = false)
    AND ("is_super_admin" = false)
  );

CREATE POLICY "Users can update own profile" ON "public"."profiles"
  FOR UPDATE TO "authenticated"
  USING ("auth"."uid"() = "id" AND "deleted_at" IS NULL)
  WITH CHECK (
    ("auth"."uid"() = "id")
    AND ("is_admin" = false)
    AND ("is_super_admin" = false)
    AND "deleted_at" IS NULL
  );
CREATE POLICY "Users can create orders" ON "public"."orders" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));
CREATE POLICY "Users can delete from their own wishlist" ON "public"."wishlist" FOR DELETE USING (("auth"."uid"() = "user_id"));
CREATE POLICY "Users can insert into their own wishlist" ON "public"."wishlist" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));
CREATE POLICY "Users can insert own order items" ON "public"."order_items" FOR INSERT WITH CHECK ((EXISTS (SELECT 1 FROM "public"."orders" WHERE (("orders"."id" = "order_items"."order_id") AND ("orders"."user_id" = "auth"."uid"())))));
CREATE POLICY "Users can view their own order items" ON "public"."order_items" FOR SELECT USING ((EXISTS (SELECT 1 FROM "public"."orders" WHERE (("orders"."id" = "order_items"."order_id") AND ("orders"."user_id" = "auth"."uid"())))));
CREATE POLICY "Users can view their own orders" ON "public"."orders" FOR SELECT USING (("auth"."uid"() = "user_id"));
CREATE POLICY "Users can view their own wishlist" ON "public"."wishlist" FOR SELECT USING (("auth"."uid"() = "user_id"));

ALTER TABLE "public"."messages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."order_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."orders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."products" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."signup_rate_limit" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."wishlist" ENABLE ROW LEVEL SECURITY;

ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";

GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

REVOKE ALL ON FUNCTION "public"."add_admin"("target_email" "text") FROM "anon";
GRANT EXECUTE ON FUNCTION "public"."add_admin"("target_email" "text") TO "authenticated";
GRANT EXECUTE ON FUNCTION "public"."add_admin"("target_email" "text") TO "service_role";
REVOKE ALL ON FUNCTION "public"."check_wishlist_limit"() FROM "anon";
REVOKE ALL ON FUNCTION "public"."check_wishlist_limit"() FROM "authenticated";
GRANT EXECUTE ON FUNCTION "public"."check_wishlist_limit"() TO "service_role";
REVOKE ALL ON FUNCTION "public"."delete_user_account"() FROM "anon";
GRANT EXECUTE ON FUNCTION "public"."delete_user_account"() TO "authenticated";
GRANT EXECUTE ON FUNCTION "public"."delete_user_account"() TO "service_role";
REVOKE ALL ON FUNCTION "public"."handle_new_user"() FROM "anon";
REVOKE ALL ON FUNCTION "public"."handle_new_user"() FROM "authenticated";
GRANT EXECUTE ON FUNCTION "public"."handle_new_user"() TO "service_role";
REVOKE ALL ON FUNCTION "public"."remove_admin"("target_id" "uuid") FROM "anon";
GRANT EXECUTE ON FUNCTION "public"."remove_admin"("target_id" "uuid") TO "authenticated";
GRANT EXECUTE ON FUNCTION "public"."remove_admin"("target_id" "uuid") TO "service_role";

GRANT ALL ON TABLE "public"."messages" TO "anon";
GRANT ALL ON TABLE "public"."messages" TO "authenticated";
GRANT ALL ON TABLE "public"."messages" TO "service_role";
GRANT ALL ON SEQUENCE "public"."messages_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."messages_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."messages_id_seq" TO "service_role";
GRANT ALL ON TABLE "public"."order_items" TO "anon";
GRANT ALL ON TABLE "public"."order_items" TO "authenticated";
GRANT ALL ON TABLE "public"."order_items" TO "service_role";
GRANT ALL ON SEQUENCE "public"."order_items_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."order_items_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."order_items_id_seq" TO "service_role";
GRANT ALL ON TABLE "public"."orders" TO "anon";
GRANT ALL ON TABLE "public"."orders" TO "authenticated";
GRANT ALL ON TABLE "public"."orders" TO "service_role";
GRANT ALL ON SEQUENCE "public"."orders_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."orders_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."orders_id_seq" TO "service_role";
GRANT ALL ON TABLE "public"."products" TO "anon";
GRANT ALL ON TABLE "public"."products" TO "authenticated";
GRANT ALL ON TABLE "public"."products" TO "service_role";
GRANT ALL ON SEQUENCE "public"."products_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."products_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."products_id_seq" TO "service_role";
REVOKE ALL ON TABLE "public"."profiles" FROM "anon";
REVOKE ALL ON TABLE "public"."profiles" FROM "authenticated";
GRANT SELECT, INSERT ON TABLE "public"."profiles" TO "authenticated";
GRANT SELECT ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";
GRANT ALL ON TABLE "public"."wishlist" TO "anon";
GRANT ALL ON TABLE "public"."wishlist" TO "authenticated";
GRANT ALL ON TABLE "public"."wishlist" TO "service_role";
GRANT ALL ON SEQUENCE "public"."wishlist_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."wishlist_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."wishlist_id_seq" TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";

REVOKE UPDATE ON TABLE "public"."profiles" FROM "authenticated";
GRANT UPDATE ("username", "address", "phone") ON TABLE "public"."profiles" TO "authenticated";