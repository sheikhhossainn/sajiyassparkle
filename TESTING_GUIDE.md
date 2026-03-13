# Admin Dashboard Product Management - Testing Guide

## Changes Made

### 1. **JavaScript File Completely Rewritten** (`frontend/js/admin-dashboard.js`)
   - Better error handling and logging
   - Improved event listener setup (all in one function)
   - Console logs for debugging
   - Proper async/await handling
   - Better null checking with optional chaining (`?.`)
   - Better type conversion for product IDs

### 2. **HTML Form Updated** (`frontend/pages/admin-dashboard.html`)
   - Added `Category` field (optional) to the product form
   - All required elements properly marked with `*`

### 3. **Database Schema Updated** (`supabase_schema.sql`)
   - Made `category` field optional with default value 'General'

## How to Test

### Step 1: Open Browser Developer Console
1. Open `admin-dashboard.html` in your browser
2. Press `F12` or `Ctrl+Shift+I` to open Developer Console
3. Go to the **Console** tab

### Step 2: Check for Initialization Log
You should see these logs in the console (scroll to top):
```
Initializing Admin Dashboard...
```

If you see errors, check:
- Is `import { supabase } from './supabase.js'` loading?
- Check the **Network** tab to see if supabase.js is loading
- Check for CORS errors

### Step 3: Test Add Product
1. Click the **"+ Add New Product"** button
2. Check console for: `Add Product button clicked`
3. Check console for: `Modal opened: productModal`
4. Look for these inputs in the modal:
   - Product Name
   - Category
   - Price
   - Product Image URL
   - Stock Status dropdown
   - Stock Quantity
5. Fill in the form with test data:
   - Name: "Test Product"
   - Category: "Test Category"
   - Price: "1000"
   - Image URL: "https://placehold.co/400x300"
   - Stock Status: "In Stock"
   - Stock Quantity: "10"
6. Click **"Save Product"**
7. Check console for:
   - `Form submitted`
   - `Adding new product`
   - `Product added successfully` notification

### Step 4: Check if Product Appears
1. After saving, you should see a notification: "Product added successfully"
2. The product should appear in the Product Inventory section
3. Console should show: `Loaded products: 1` (or more if you had existing products)

### Step 5: Test Search
1. Type in the search box: "Test"
2. Console should show: `Search term: test`
3. Console should show: `Filtered products: 1`
4. Only your test product should be visible

### Step 6: Test Edit
1. Click **"Edit"** button on a product card
2. Console should show: `Edit product ID: [number]`
3. Console should show: `Modal opened: productModal`
4. Form should be pre-filled with product data
5. Change one field (e.g., price)
6. Click **"Save Product"**
7. Console should show: `Updating product ID: [number]`
8. Notification: "Product updated successfully"

### Step 7: Test Delete
1. Click **"Delete"** button on a product card
2. Console should show: `Delete product ID: [number]`
3. A confirmation modal should appear
4. Click **"Delete"** in the confirmation modal
5. Console should show: `Deleting product ID: [number]`
6. Notification: "Product deleted successfully"
7. Product should disappear from the list

## Common Issues and Solutions

### Issue 1: Modals Don't Appear
**Symptoms:** Button clicks but no modal shows up
**Solution:**
- Check console for errors
- Verify modal CSS display property is working (`modal.style.display = 'flex'`)
- Check if `#productModal` and `#deleteModal` elements exist in HTML
- Verify CSS classes `.modal` have `display: none` by default

### Issue 2: Form Doesn't Submit
**Symptoms:** Click save but nothing happens
**Solution:**
- Check console for validation error: "Please fill in all required fields"
- Make sure all required fields (*) are filled
- Check if form has `id="productForm"`
- Check network tab for Supabase errors

### Issue 3: Products Don't Load
**Symptoms:** "No products found" message, or empty list
**Solution:**
- Check Supabase URL and API key are correct in `frontend/js/supabase.js`
- Check browser console for Supabase errors
- Log into Supabase dashboard and verify:
  - Products table exists
  - Has correct columns: `id`, `name`, `price`, `image_url`, `stock_status`, `stock_quantity`, `category`
  - RLS policies are correct (should allow public read, admin insert/update/delete)
- Try inserting a test product directly in Supabase dashboard first

### Issue 4: Search Doesn't Work
**Symptoms:** Search input doesn't filter products
**Solution:**
- Type in search box
- Check console for: `Search term: [your text]`
- Check console for: `Filtered products: [count]`
- If not appearing, verify search input has `id="productSearch"`

### Issue 5: Image Preview Doesn't Show
**Symptoms:** No preview image when entering URL
**Solution:**
- Check if `#imagePreview` element exists in HTML
- Check browser console for image load errors (CORS issues)
- Try with a simple URL first: `https://placehold.co/400x300`

## Database RLS Policies Check

If products aren't loading, the RLS policies might be too restrictive. Run this SQL in Supabase to check:

```sql
-- Check existing policies
SELECT * FROM pg_policies WHERE tablename = 'products';

-- If needed, drop and recreate policies
DROP POLICY IF EXISTS "Products are viewable by everyone" ON products;

CREATE POLICY "Products are viewable by everyone" 
  ON products FOR SELECT 
  USING (true);
```

## Test Data SQL

If you want to insert test products directly into Supabase:

```sql
INSERT INTO products (name, category, price, image_url, stock_status, stock_quantity, created_at, updated_at)
VALUES 
  ('Gold Necklace', 'Necklaces', 12500, 'https://placehold.co/400x300', 'In Stock', 15, now(), now()),
  ('Diamond Ring', 'Rings', 25000, 'https://placehold.co/400x300', 'In Stock', 3, now(), now()),
  ('Emerald Earrings', 'Earrings', 18000, 'https://placehold.co/400x300', 'In Stock', 22, now(), now());
```

## Connection Verification

To verify Supabase is connected properly, check the console for:
1. `Initializing Admin Dashboard...`
2. `Loading products from Supabase...`
3. Either `Loaded products: [count]` or an error message

If you see an error like "Failed to fetch", check:
- Network tab for blocked requests
- CORS settings in Supabase dashboard
- Supabase URL matches the project URL

## Keyboard Shortcuts
- **Esc** - Close modals
- **Ctrl+Shift+I** - Open developer console

## Success Indicators

✅ All features working when you see:
1. Products load from database
2. Add product button opens modal
3. Form submits and product appears
4. Edit button opens modal with pre-filled data
5. Delete button shows confirmation and removes product
6. Search filters products in real-time
7. All console logs appear without errors
8. Notifications appear for success/error

