# MySQL Database Setup Guide

## 🎯 Pilihan Setup Database untuk Discux3

Anda punya beberapa opsi untuk setup MySQL database:

---

## ✅ **Opsi 1: XAMPP (RECOMMENDED - Paling Mudah untuk Windows)**

XAMPP sudah include MySQL, PHP, dan Apache dalam satu installer.

### Install XAMPP
```powershell
# Install via winget
winget install ApacheFriends.Xampp.8.2

# Atau download manual dari: https://www.apachefriends.org/
```

### Setelah Install XAMPP:

1. **Buka XAMPP Control Panel**
   - Start Menu → XAMPP → XAMPP Control Panel

2. **Start MySQL Service**
   - Klik tombol "Start" di sebelah MySQL
   - MySQL akan running di port 3306

3. **Buat Database**
   ```powershell
   # Buka phpMyAdmin di browser
   # http://localhost/phpmyadmin
   
   # Atau gunakan MySQL CLI
   cd C:\xampp\mysql\bin
   .\mysql.exe -u root -p
   ```

4. **Di MySQL CLI, jalankan:**
   ```sql
   CREATE DATABASE discux3;
   CREATE USER 'discux3'@'localhost' IDENTIFIED BY 'password123';
   GRANT ALL PRIVILEGES ON discux3.* TO 'discux3'@'localhost';
   FLUSH PRIVILEGES;
   EXIT;
   ```

5. **Update .env file:**
   ```env
   DATABASE_URL="mysql://discux3:password123@localhost:3306/discux3"
   ```

---

## ✅ **Opsi 2: MySQL Official (Untuk Production-like Setup)**

### Install MySQL 8.0
```powershell
winget install Oracle.MySQL
```

### Setelah Install:

1. **MySQL akan install sebagai Windows Service**
2. **Set root password saat installation wizard**
3. **Buat database menggunakan MySQL Workbench atau CLI**

### Buat Database via MySQL Workbench:
1. Open MySQL Workbench
2. Connect to Local Instance
3. Run SQL:
   ```sql
   CREATE DATABASE discux3;
   ```

### Update .env:
```env
DATABASE_URL="mysql://root:yourpassword@localhost:3306/discux3"
```

---

## ✅ **Opsi 3: Docker (Recommended untuk Development)**

Jika Anda sudah punya Docker Desktop:

### docker-compose.yml
```yaml
version: '3.8'
services:
  mysql:
    image: mysql:8.0
    container_name: discux3-mysql
    environment:
      MYSQL_ROOT_PASSWORD: root
      MYSQL_DATABASE: discux3
      MYSQL_USER: discux3
      MYSQL_PASSWORD: password123
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql

volumes:
  mysql_data:
```

### Jalankan:
```powershell
docker-compose up -d
```

### Update .env:
```env
DATABASE_URL="mysql://discux3:password123@localhost:3306/discux3"
```

---

## ✅ **Opsi 4: Cloud Database (Untuk Production/Quick Start)**

### PlanetScale (Free Tier Available)
1. Sign up di https://planetscale.com
2. Create database
3. Copy connection string
4. Update .env dengan connection string

### Supabase (Gunakan PostgreSQL adapter)
1. Sign up di https://supabase.com
2. Create project
3. Update Prisma schema ke PostgreSQL:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```

---

## 🚀 Setelah Database Ready

### 1. Update .env file
```env
# Sesuaikan dengan setup Anda
DATABASE_URL="mysql://user:password@localhost:3306/discux3"
```

### 2. Generate Prisma Client
```powershell
npx prisma generate
```

### 3. Push Schema ke Database
```powershell
npx prisma db push
```

Output yang diharapkan:
```
Environment variables loaded from .env
Prisma schema loaded from prisma\schema.prisma
Datasource "db": MySQL database "discux3" at "localhost:3306"

🚀  Your database is now in sync with your Prisma schema. Done in 1.2s

✔ Generated Prisma Client to ./node_modules/@prisma/client in 180ms
```

### 4. (Optional) Buka Prisma Studio untuk lihat database
```powershell
npx prisma studio
```

### 5. Verify Connection
```powershell
npm run dev
```

---

## 🔍 Troubleshooting

### Error: Can't connect to MySQL server
- Pastikan MySQL service running
- Check port 3306 tidak dipakai aplikasi lain
- Verify credentials di .env

### Error: Access denied for user
- Check username dan password di DATABASE_URL
- Pastikan user punya permission ke database

### Error: Database does not exist
```sql
CREATE DATABASE discux3;
```

### Error: Table already exists
```powershell
# Reset database
npx prisma db push --force-reset
```

---

## 📝 Next Steps Setelah Database Setup

1. ✅ Database running
2. ✅ Prisma schema pushed
3. ✅ Connection verified
4. 🚀 **Ready untuk Phase 3: Agent System**

---

## 🎯 Rekomendasi Saya

**Untuk development lokal di Windows:**
- **XAMPP** - Paling mudah, sudah termasuk phpMyAdmin
- **Docker** - Jika sudah familiar dengan Docker
- **MySQL Official** - Untuk setup lebih production-like

**Untuk production nanti:**
- **PlanetScale** - MySQL serverless dengan free tier
- **AWS RDS** - Scalable dan reliable
- **Railway** - Simple deployment

---

## 💬 Pilih Opsi Anda

Setelah pilih salah satu opsi dan setup database, jalankan:

```powershell
npx prisma db push
```

Kemudian beri tahu saya untuk lanjut ke **Phase 3: Agent System** 🚀
