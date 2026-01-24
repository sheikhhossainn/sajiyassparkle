## 📚 Group Project Workflow with Git

This guide explains how our team collaborates on this project using Git and GitHub. Follow these steps carefully to avoid conflicts and keep the code organized.

---

### 🧑‍🤝‍🧑 Team Structure

- **5 Team Members**: Each works on their own feature branch
- **1 Team Lead**: Reviews and merges all Pull Requests

---

### 🌳 Branch Structure

```
main          → Final, stable code (protected, no direct pushes)
  ↑
dev           → Development branch (protected, no direct pushes)
  ↑
feature/*     → Your personal working branches
```

---

### ⚠️ Golden Rules

- ❌ **Never push directly to `main` or `dev`**
- ✅ **Always work in your own `feature/<task-name>` branch**
- ✅ **All changes must go through a Pull Request (PR)**
- ✅ **Only the team lead merges PRs**

---

### 🚀 Step-by-Step Workflow

#### **Step 1: Clone the Repository (First Time Only)**

```bash
git clone https://github.com/sheikhhossainn/sajiyassparkle.git
cd sajiyassparkle
```

---

#### **Step 2: Pull the Latest `dev` Branch**

Before starting any new work, make sure you have the latest code:

```bash
git checkout dev
git pull origin dev
```

---

#### **Step 3: Create Your Feature Branch**

Create a new branch from `dev` for your task:

```bash
git checkout -b feature/your-task-name
```

**Example:**
```bash
git checkout -b feature/add-login-page
```

---

#### **Step 4: Make Changes and Commit**

Work on your task, then save your changes:

```bash
git add .
git commit -m "Add login page UI"
```

**Tips:**
- Commit often with clear messages
- Keep commits small and focused

---

#### **Step 5: Push Your Feature Branch**

Upload your branch to GitHub:

```bash
git push origin feature/your-task-name
```

---

#### **Step 6: Update Your Branch with Latest `dev`**

Before creating a Pull Request, merge the latest `dev` into your branch to avoid conflicts:

```bash
git checkout dev
git pull origin dev
git checkout feature/your-task-name
git merge dev
```

If there are **merge conflicts**:
1. Open the conflicted files
2. Look for `<<<<<<<`, `=======`, `>>>>>>>` markers
3. Edit the file to keep the correct code
4. Save the file
5. Run:
   ```bash
   git add .
   git commit -m "Resolve merge conflicts"
   git push origin feature/your-task-name
   ```

---

#### **Step 7: Create a Pull Request (PR)**

1. Go to the repository on GitHub
2. Click **"Pull Requests"** → **"New Pull Request"**
3. Set:
   - **Base:** `dev`
   - **Compare:** `feature/your-task-name`
4. Add a clear title and description
5. Click **"Create Pull Request"**
6. Notify the team lead for review

---

#### **Step 8: Team Lead Reviews and Merges**

- The **team lead** reviews the PR
- If approved, the team lead merges it into `dev`
- Once merged, you can delete your feature branch

---

### ✅ Quick Command Cheat Sheet

| Action | Command |
|--------|---------|
| Pull latest `dev` | `git checkout dev` → `git pull origin dev` |
| Create feature branch | `git checkout -b feature/task-name` |
| Save changes | `git add .` → `git commit -m "message"` |
| Push branch | `git push origin feature/task-name` |
| Update branch with `dev` | `git checkout dev` → `git pull origin dev` → `git checkout feature/task-name` → `git merge dev` |

---

### 💡 Best Practices

- **Pull `dev` often** to stay up-to-date
- **Commit frequently** with clear messages
- **Test your code** before creating a PR
- **Ask for help** if you encounter merge conflicts
- **Delete old branches** after they're merged

---

### 🆘 Need Help?

- **Stuck with conflicts?** Ask the team lead or a teammate
- **Not sure about a command?** Check this guide or ask first
- **Made a mistake?** Don't panic—Git can usually undo things

---

**Happy Coding! 🎉**