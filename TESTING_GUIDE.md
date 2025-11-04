# 🧪 Discux3 - Testing Guide

**Time Required:** 10-15 minutes  
**Goal:** Verify all features work correctly

---

## 🚀 Step 1: Start Development Server

```powershell
# Open Terminal/PowerShell
cd D:\Project\discux3
npm run dev
```

**Expected Output:**
```
  ▲ Next.js 14.2.5
  - Local:        http://localhost:3000
  - Environments: .env

 ✓ Ready in 2-3s
```

**✅ Check:**
- [ ] No compilation errors
- [ ] Server starts successfully
- [ ] Shows "Ready" message

**If errors:** Share the error message

---

## 🌐 Step 2: Test Home Page

**Action:** Open browser → `http://localhost:3000`

**Expected:**
```
✓ Page loads
✓ Shows "Welcome to Discux3"
✓ Shows "Multi-Agent Collaboration Hub"
✓ No console errors (F12 → Console tab)
```

**✅ Checklist:**
- [ ] Home page loads
- [ ] Text displays correctly
- [ ] Tailwind CSS working (styling looks good)
- [ ] No errors in console

**Screenshot:** Take a screenshot if you want!

---

## 👤 Step 3: Test Registration

**Action:** Navigate → `http://localhost:3000/register`

**Expected UI:**
```
✓ Clean registration form
✓ Fields: Name, Email, Password
✓ "Sign Up" button
✓ Link to "Already have account? Sign In"
```

**Fill Form:**
```
Name: Test User
Email: test@example.com
Password: test1234
```

**Click:** "Sign Up"

**Expected Result:**
```
✓ Redirects to /login
✓ Shows green success message
✓ "Account created successfully! Please sign in."
```

**✅ Checklist:**
- [ ] Form renders correctly
- [ ] Can type in all fields
- [ ] Validation works (try empty fields)
- [ ] Submit button works
- [ ] Redirects to login
- [ ] Success message shows

**If fails:** Note the error message

---

## 🔍 Step 4: Verify Database

**Action:** Open new terminal

```powershell
cd D:\Project\discux3
npx prisma studio
```

**Expected:**
```
✓ Opens http://localhost:5555
✓ Prisma Studio interface loads
```

**Navigate:**
1. Click "User" table (left sidebar)
2. Find your test user

**Expected Data:**
```
✓ Email: test@example.com
✓ Name: Test User
✓ Password: $2a$12$... (hashed, not plain text!)
✓ subscription: FREE
✓ maxAgents: 3
✓ maxRooms: 1
✓ maxMessagesPerMonth: 100
```

**✅ Checklist:**
- [ ] User exists in database
- [ ] Password is hashed
- [ ] Default limits set correctly
- [ ] All fields populated

**Screenshot:** Optional but helpful!

---

## 🔐 Step 5: Test Login

**Action:** Go to `http://localhost:3000/login`

**Try Wrong Password First:**
```
Email: test@example.com
Password: wrongpassword
```

**Expected:**
```
✓ Shows error: "Invalid email or password"
✓ Doesn't redirect
✓ Form stays on page
```

**Now Try Correct Credentials:**
```
Email: test@example.com
Password: test1234
```

**Expected Result:**
```
✓ Redirects to /agents
✓ No error message
✓ Login successful
```

**✅ Checklist:**
- [ ] Wrong password shows error
- [ ] Correct password logs in
- [ ] Redirects to /agents
- [ ] Session is created

---

## 📋 Step 6: Test Agents List Page

**Current URL:** `http://localhost:3000/agents` (after login)

**Expected UI:**
```
✓ Header: "My Agents"
✓ Subtitle: "Create and manage your AI agents..."
✓ "Create Agent" button (top right)
✓ Empty state message (no agents yet)
✓ "No agents yet" with helpful text
```

**✅ Checklist:**
- [ ] Page loads without errors
- [ ] Header and button visible
- [ ] Empty state shows correctly
- [ ] Layout looks good
- [ ] Responsive (try resizing window)

---

## ➕ Step 7: Test Create Agent Form

**Action:** Click "Create Agent" button

**Expected:** Redirects to `http://localhost:3000/agents/create`

**Expected UI:**
```
Left Column (Form):
✓ Name field
✓ Emoji picker (10 options)
✓ Color palette (7 colors)
✓ Style dropdown (5 options)
✓ System Prompt textarea
✓ Create/Cancel buttons

Right Column (Preview):
✓ Live preview card
✓ Shows selected emoji & color
✓ Updates in real-time
✓ Tips section
```

**Test Validation:**

**1. Submit Empty Form:**
```
Click "Create Agent" without filling
Expected: Red error messages appear
```

**2. Fill Name Only:**
```
Name: Marketing Expert
Click "Create Agent"
Expected: Prompt error appears
```

**3. Short Prompt:**
```
Name: Marketing Expert
Prompt: Test (only 4 chars)
Expected: "Prompt must be at least 10 characters"
```

**✅ Checklist:**
- [ ] Form renders completely
- [ ] Emoji picker works (click different emojis)
- [ ] Color picker works (click different colors)
- [ ] Style dropdown works
- [ ] Preview updates in real-time
- [ ] Validation shows errors
- [ ] Can't submit invalid data

---

## ✨ Step 8: Create First Agent

**Fill Form Completely:**
```
Name: Marketing Assistant
Emoji: 🚀 (click the rocket)
Color: Blue (click blue color)
Style: Professional
Prompt: You are a marketing expert who helps create compelling content and strategies for digital marketing campaigns. You provide actionable advice based on current trends and best practices.
```

**Watch Preview:**
```
✓ Preview shows "Marketing Assistant"
✓ Shows 🚀 emoji
✓ Shows blue background
✓ Shows "Professional" style
✓ Shows truncated prompt
```

**Click:** "Create Agent"

**Expected Result:**
```
✓ Redirects to /agents
✓ Shows your new agent card
✓ Card displays:
  - 🚀 emoji
  - "Marketing Assistant" name
  - "Professional" badge
  - Prompt preview (3 lines)
  - "0 uses" count
  - Edit/Delete menu (3 dots)
```

**✅ Checklist:**
- [ ] Form submits successfully
- [ ] Redirects to list
- [ ] Agent appears in list
- [ ] All data displays correctly
- [ ] Card looks good

---

## 🗑️ Step 9: Test Agent Actions

**On the agent card:**

**Test Edit Menu:**
```
1. Click 3-dot menu (⋮)
Expected: Dropdown opens with Edit & Delete
```

**Test Delete:**
```
1. Click "Delete"
Expected: Confirmation dialog
2. Click "Cancel" first
Expected: Nothing happens
3. Click Delete again → Confirm
Expected: 
  - Agent removed from list
  - Back to empty state
  - No errors
```

**✅ Checklist:**
- [ ] Menu opens/closes
- [ ] Delete confirmation works
- [ ] Cancel works
- [ ] Delete removes agent
- [ ] UI updates correctly

---

## ✅ Step 10: Create Multiple Agents

**Test subscription limits:**

**Create Agent #1:**
```
Name: Creative Writer
Emoji: 🎨
Style: Creative
Prompt: You are a creative content writer who crafts engaging stories and compelling narratives.
```

**Create Agent #2:**
```
Name: Data Analyst
Emoji: 📊
Style: Analytical
Prompt: You are a data analyst who provides insights based on data analysis and statistical methods.
```

**Create Agent #3:**
```
Name: Strategic Advisor
Emoji: 🎯
Style: Professional
Prompt: You are a strategic advisor who helps with business planning and decision making.
```

**Try Agent #4:**
```
Name: Fourth Agent
Prompt: Test if limit works...
Expected: Error message about reaching limit (3 agents max for FREE tier)
```

**✅ Checklist:**
- [ ] Can create 3 agents
- [ ] All 3 appear in list
- [ ] Grid layout works (responsive)
- [ ] Each card unique
- [ ] 4th agent blocked with error
- [ ] Subscription limit enforced

---

## 🎨 Step 11: Test Different Styles

**Verify you have agents with:**
- [ ] Professional style ✓
- [ ] Creative style ✓
- [ ] Analytical style ✓

**Check visual differences:**
- [ ] Each has different emoji
- [ ] Each has different color
- [ ] Style badge shows correctly
- [ ] Prompts are different

---

## 🔄 Step 12: Test Logout (If implemented)

**Current state:** You should be logged in

**Try accessing protected page:**
```
1. Note current URL
2. Close browser (or clear cookies)
3. Reopen http://localhost:3000/agents
Expected: Redirects to /login (protected route)
```

**✅ Checklist:**
- [ ] Protected routes redirect to login
- [ ] Can't access agents without session
- [ ] Session persists after refresh

---

## 📊 Final Verification

### Database Check:
```powershell
# In Prisma Studio (http://localhost:5555)
Check tables:
✓ users → 1 user
✓ agents → 3 agents
✓ sessions → 1 session (if logged in)
```

### Console Check:
```
F12 → Console Tab
✓ No red errors
✓ Only expected warnings (if any)
```

### Network Check:
```
F12 → Network Tab
Reload /agents page
✓ Status 200 OK
✓ No 404 errors
✓ No 500 errors
```

---

## ✅ Success Checklist

**Mark what works:**
- [ ] Registration (create account)
- [ ] Login (authenticate)
- [ ] Session persistence
- [ ] Agent list page
- [ ] Create agent form
- [ ] Form validation
- [ ] Agent creation
- [ ] Agent display
- [ ] Agent deletion
- [ ] Subscription limits
- [ ] Database storage
- [ ] No console errors

**Total Working:** ___/12

---

## 🐛 If You Find Bugs

**Report format:**
```
Page: [e.g., /agents/create]
Action: [what you did]
Expected: [what should happen]
Actual: [what happened]
Error: [any error messages]
Screenshot: [optional]
```

---

## 🎉 Expected Results

**If everything works:**
```
✓ 12/12 features working
✓ No errors in console
✓ Database properly storing data
✓ UI looks good
✓ Forms validate correctly
✓ Navigation works smoothly

= READY FOR PHASE 3.4 & 3.5! 🚀
```

**If some issues:**
```
→ Note the issues
→ Share error messages
→ I'll fix immediately
→ Re-test
```

---

## 🚀 After Testing

**If all good:**
```
✓ Phase 3.1-3.3 verified working
→ Ready to build Edit Page
→ Ready to build Testing Panel
→ Phase 3 completion: 30 min away!
```

**Start testing now!** 🧪

Let me know:
1. ✅ What works
2. ❌ What doesn't work (if any)
3. 📸 Screenshots (optional)
4. 💬 Any questions

**I'm here to help if anything breaks!** 💪
