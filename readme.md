# Sajiyas Sparkle

Welcome to the **Sajiyas Sparkle** e-commerce project! This repository houses the frontend codebase for our jewelry store, now powered by **Vite** for a modern development experience and **Supabase** for backend services (Database, Auth, Storage).

## 🚀 Getting Started

Follow these instructions to set up the project on your local machine.

### Prerequisites

- [Node.js](https://nodejs.org/) (v16 or higher)
- [Git](https://git-scm.com/)

### Installation

1.  **Clone the Repository**
    ```bash
    git clone https://github.com/sheikhhossainn/sajiyassparkle.git
    cd sajiyassparkle
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    ```

3.  **Environment Setup**
    Create a `.env` file in the root directory by copying the example file:
    ```bash
    cp .env.example .env
    ```
    Open `.env` and fill in your Supabase credentials:
    ```env
    VITE_SUPABASE_URL=your_project_url
    VITE_SUPABASE_ANON_KEY=your_anon_key
    ```
    *(Ask the team lead for the credentials if you don't have them)*

### Running the Project

Start the development server:

```bash
npm run dev
```

This will launch the application at `http://localhost:3000` (or another port if 3000 is busy).

### Running Unit Tests

The project uses **Vitest** for unit testing. Follow these steps to run tests:

#### **Install Test Dependencies**

The testing dependencies are already in `package.json`. If you haven't installed them yet:

```bash
npm install
```

#### **Run All Tests**

To run the complete test suite:

```bash
npm test
```

#### **Run Tests in Watch Mode**

To run tests and automatically re-run them when files change:

```bash
npm test -- --watch
```

#### **Run Tests with UI**

To see test results in a visual interface:

```bash
npm test -- --ui
```

#### **Run Specific Test File**

To run tests for a specific file:

```bash
npm test -- path/to/test/file.test.js
```

#### **Run Tests with Coverage**

To generate a coverage report showing how much of your code is tested:

```bash
npm test -- --coverage
```

#### **Test File Naming Convention**

Test files should follow this pattern:
- `*.test.js` or `*.test.ts` (e.g., `checkout.test.js`)
- Place test files in the same directory as the source file or in a `__tests__` folder

#### **Writing Tests**

Create a test file next to your source code:

```javascript
import { describe, it, expect } from 'vitest';
import { yourFunction } from './yourFile.js';

describe('Your Feature', () => {
    it('should do something', () => {
        expect(yourFunction()).toBe(true);
    });
});
```

---

### Building for Production

To create a production-ready build:

```bash
npm run build
```

The output will be in the `dist/` directory.

You can preview the production build locally:

```bash
npm run preview
```

---

## 📚 Updated Project Workflow

This guide explains how our team collaborates using Git and GitHub.

### 🧑‍🤝‍🧑 Team Structure

- **Team Members**: Work on feature branches.
- **Team Lead**: Reviews and merges Pull Requests.

### 🌳 Branch Structure

```
main          → Final, stable code (protected)
  ↑
dev           → Development branch (integration)
  ↑
feature/*     → Your personal working branches
```

### ⚠️ Golden Rules

- ❌ **Never push directly to `main` or `dev`**
- ✅ **Always work in a `feature/<task-name>` branch**
- ✅ **All changes must go through a Pull Request (PR)**

### 🚀 Workflow Steps

1.  **Pull Latest Code**: `git checkout dev && git pull origin dev`
2.  **Create Branch**: `git checkout -b feature/my-new-feature`
3.  **Code & Commit**: Make changes and commit often.
4.  **Push**: `git push origin feature/my-new-feature`
5.  **Create PR**: Open a Pull Request on GitHub targeting `dev`.

---

## 🛠 Tech Stack

- **Frontend**: HTML, CSS, JavaScript
- **Build Tool**: Vite
- **Backend/Database**: Supabase
- **Hosting**: Vercel
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