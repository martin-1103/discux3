# 🧪 Testing Agent System - Step by Step

## 📋 Pre-requisites Check

✅ MySQL running (XAMPP)
✅ Database created and synced
✅ Dependencies installed
✅ TypeScript check passing

---

## 🚀 Step 1: Start Development Server

Open a **NEW Terminal/PowerShell window** dan jalankan:

```powershell
cd D:\Project\discux3
npm run dev
```

**Expected Output:**
```
> discux3@0.1.0 dev
> next dev

  ▲ Next.js 14.2.5
  - Local:        http://localhost:3000
  - Environments: .env

 ✓ Ready in 2.5s
```

**Jika ada error:**
- Check MySQL running di XAMPP
- Check port 3000 tidak dipakai aplikasi lain
- Check .env file benar

---

## 🌐 Step 2: Test Home Page

Buka browser: **http://localhost:3000**

**Expected:**
- ✅ Halaman "Welcome to Discux3" muncul
- ✅ No console errors
- ✅ Tailwind CSS working (styling ok)

---

## 👥 Step 3: Test Agents Page

Buka: **http://localhost:3000/agents**

**Expected:**
- ✅ Page loads successfully
- ✅ Header: "My Agents"
- ✅ "Create Agent" button visible
- ✅ Empty state message (karena belum ada agent)

**Screenshot checklist:**
- [ ] Page renders without errors
- [ ] Layout looks good
- [ ] Button clickable

---

## ➕ Step 4: Test Create Agent Form

Click "Create Agent" atau buka: **http://localhost:3000/agents/create**

**Expected:**
- ✅ Form loads dengan semua fields
- ✅ Preview panel di sebelah kanan
- ✅ Emoji picker (10 options)
- ✅ Color palette (7 colors)
- ✅ Style dropdown (5 options)

**Test Validation:**

1. **Leave all fields empty → Submit**
   - Expected: Validation errors appear
   - Name: "Name is required"
   - Prompt: "Prompt must be at least 10 characters"

2. **Fill Name only → Submit**
   - Expected: Still shows prompt error

3. **Fill Name + Short prompt (< 10 chars) → Submit**
   - Expected: "Prompt must be at least 10 characters"

**Test Valid Submission:**

```
Name: Marketing Assistant
Emoji: 🚀
Color: #3B82F6 (blue)
Style: Professional
Prompt: You are a marketing expert who helps create compelling content and strategies for digital marketing campaigns.
```

Click "Create Agent"

**Expected:**
- ⚠️ **Currently will show error** because session not implemented
- Will see: Console error or alert about temp-user-id

---

## 🐛 Known Issues (Expected)

### 1. ⚠️ Session/Auth Not Working
**Error:** "temp-user-id" in console
**Reason:** NextAuth v5 not fully implemented
**Status:** Will fix in next step

### 2. ⚠️ Cannot Actually Create Agent
**Error:** Database error or session error
**Reason:** No real user session
**Status:** Will fix with authentication

### 3. ✅ UI Should Work Perfectly
**Validation:** Should work
**Preview:** Should update in real-time
**Styling:** Should look good

---

## 📊 What to Check

### Visual Tests:
- [ ] All pages load without crashing
- [ ] Styling looks good (Tailwind working)
- [ ] Components render correctly
- [ ] Buttons are clickable
- [ ] Forms are interactive
- [ ] Preview panel updates in real-time

### Functional Tests (May Fail):
- [ ] Create agent (Expected: Auth error)
- [ ] List agents (Expected: Empty)
- [ ] Edit agent (Not implemented yet)
- [ ] Delete agent (Not implemented yet)

---

## 🔍 Debugging

### Check Browser Console:
```javascript
// Should see Next.js dev server logs
// May see "temp-user-id" warnings
// Check for any red errors
```

### Check Terminal:
```
// Should see compilation logs
// Check for TypeScript errors
// Watch for Prisma connection issues
```

### Common Issues:

**Port 3000 already in use:**
```powershell
# Find process using port 3000
netstat -ano | findstr :3000

# Kill it
taskkill /PID <PID> /F

# Or use different port
$env:PORT=3001; npm run dev
```

**Database connection error:**
```
# Check XAMPP MySQL is running
# Check .env DATABASE_URL is correct
# Try:
npx prisma db push
```

**Module not found:**
```powershell
# Reinstall dependencies
npm install

# Clear Next.js cache
Remove-Item -Recurse -Force .next
npm run dev
```

---

## 📸 Screenshots to Take

1. **Home Page** - http://localhost:3000
2. **Agents List (Empty)** - http://localhost:3000/agents
3. **Create Agent Form** - http://localhost:3000/agents/create
4. **Form Validation** - Try submitting empty
5. **Preview Panel** - Fill form and show preview
6. **Console** - Any errors

---

## ✅ Success Criteria

Even with auth issues, these should work:

- ✅ All pages load
- ✅ No compilation errors
- ✅ UI renders correctly
- ✅ Forms are interactive
- ✅ Validation works
- ✅ Preview updates
- ✅ Styling looks good

---

## 🎯 Next Steps After Testing

Based on test results:

### If Everything Renders OK:
✅ Proceed to fix authentication

### If There Are Errors:
1. Note the errors
2. Check console
3. Share error messages
4. We'll debug together

---

## 🆘 Quick Fixes

### Clear Everything and Restart:
```powershell
# Stop dev server (Ctrl+C)

# Clear cache
Remove-Item -Recurse -Force .next

# Regenerate Prisma
npx prisma generate

# Restart
npm run dev
```

### Reset Database:
```powershell
npx prisma db push --force-reset
```

---

## 📞 Ready to Test!

1. **Open NEW terminal**
2. **Run:** `npm run dev`
3. **Open browser:** http://localhost:3000
4. **Navigate through pages**
5. **Report back with results!**

Expected: UI works, auth doesn't (we'll fix that next)

---

**Test Time Estimate:** 5-10 minutes  
**Next:** Fix Authentication  
**Then:** Build Edit Page & Testing Panel
