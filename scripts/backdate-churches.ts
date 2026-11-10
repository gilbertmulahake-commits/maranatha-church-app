import 'dotenv/config'
import { prisma } from '../lib/prisma'

async function main() {
  console.log('🚀 Starting bulk backdate of churches...\n')

  // The target date: January 1st, 2026
  const targetDate = new Date('2026-01-01T00:00:00.000Z')

  try {
    // We update all churches EXCEPT CH004 (so we keep your 2025 multi-year test case)
    const result = await prisma.church.updateMany({
      where: {
        church_code: {
          not: 'CH004'
        }
      },
      data: {
        created_at: targetDate
      }
    })

    console.log(`✅ Successfully backdated ${result.count} churches to ${targetDate.toDateString()}`)
    console.log(`⏭️  Skipped CH004 (keeping it at Jan 2025 for multi-year testing)\n`)
    
    console.log('🎉 DONE! Go check your National Dashboard and Reports tab.')
  } catch (error) {
    console.error('❌ Failed to backdate churches:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()