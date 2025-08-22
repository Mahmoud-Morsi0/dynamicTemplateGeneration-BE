#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

const dbPath = path.join(__dirname, '../storage/app.db')

console.log('🗄️  Resetting database...')

try {
  // Remove the existing database file
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath)
    console.log('✅ Old database file removed')
  }

  console.log('✅ Database reset complete')
  console.log('💡 Run "npm run db:migrate" to create fresh database')
} catch (error) {
  console.error('❌ Error resetting database:', error.message)
  console.log('💡 If the file is in use, close all applications and try again')
  process.exit(1)
}
