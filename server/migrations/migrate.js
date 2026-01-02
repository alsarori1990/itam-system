import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

/**
 * نظام Database Migrations
 * لتحديث بنية قاعدة البيانات بدون فقدان البيانات
 */

const migrations = [
  {
    version: 1,
    name: 'add_indexes_to_assets',
    up: async () => {
      console.log('Running migration: add_indexes_to_assets');
      const db = mongoose.connection.db;
      await db.collection('assets').createIndex({ serialNumber: 1 }, { unique: true });
      await db.collection('assets').createIndex({ status: 1, location: 1 });
      console.log('✅ Indexes added');
    },
    down: async () => {
      const db = mongoose.connection.db;
      await db.collection('assets').dropIndex('serialNumber_1');
      await db.collection('assets').dropIndex('status_1_location_1');
    }
  },
  {
    version: 2,
    name: 'add_email_field_to_tickets',
    up: async () => {
      console.log('Running migration: add_email_field_to_tickets');
      const db = mongoose.connection.db;
      
      // إضافة حقل email للتذاكر الموجودة (إذا لم يكن موجوداً)
      await db.collection('tickets').updateMany(
        { requesterEmail: { $exists: false } },
        { $set: { requesterEmail: '' } }
      );
      
      console.log('✅ Email field added to existing tickets');
    },
    down: async () => {
      const db = mongoose.connection.db;
      await db.collection('tickets').updateMany(
        {},
        { $unset: { requesterEmail: '' } }
      );
    }
  },
  {
    version: 3,
    name: 'add_timestamps_to_all_collections',
    up: async () => {
      console.log('Running migration: add_timestamps_to_all_collections');
      const db = mongoose.connection.db;
      const now = new Date();
      
      // إضافة timestamps للسجلات القديمة
      const collections = ['assets', 'tickets', 'subscriptions', 'simcards'];
      
      for (const collectionName of collections) {
        await db.collection(collectionName).updateMany(
          { createdAt: { $exists: false } },
          { 
            $set: { 
              createdAt: now,
              updatedAt: now
            } 
          }
        );
      }
      
      console.log('✅ Timestamps added');
    },
    down: async () => {
      // عادة لا نحتاج لحذف timestamps
      console.log('No rollback needed');
    }
  }
];

// تتبع Migrations المنفذة
const MigrationSchema = new mongoose.Schema({
  version: { type: Number, required: true, unique: true },
  name: { type: String, required: true },
  executedAt: { type: Date, default: Date.now }
});

const Migration = mongoose.model('Migration', MigrationSchema);

async function runMigrations() {
  try {
    // الاتصال بقاعدة البيانات
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database');
    
    // الحصول على Migrations المنفذة
    const executedMigrations = await Migration.find().sort({ version: 1 });
    const executedVersions = executedMigrations.map(m => m.version);
    
    console.log(`📊 Executed migrations: ${executedVersions.join(', ') || 'none'}`);
    
    // تنفيذ Migrations الجديدة
    let hasNewMigrations = false;
    
    for (const migration of migrations) {
      if (!executedVersions.includes(migration.version)) {
        console.log(`\n🔄 Running migration ${migration.version}: ${migration.name}`);
        
        try {
          await migration.up();
          
          // تسجيل Migration
          await Migration.create({
            version: migration.version,
            name: migration.name
          });
          
          console.log(`✅ Migration ${migration.version} completed`);
          hasNewMigrations = true;
          
        } catch (error) {
          console.error(`❌ Migration ${migration.version} failed:`, error);
          throw error;
        }
      }
    }
    
    if (!hasNewMigrations) {
      console.log('\n✅ All migrations up to date');
    } else {
      console.log('\n✅ All new migrations completed successfully');
    }
    
  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('👋 Database connection closed');
  }
}

// تنفيذ
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigrations();
}

export default runMigrations;
