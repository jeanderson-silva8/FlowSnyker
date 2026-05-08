import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from '../config/db';
import Board from '../models/Board';

dotenv.config();

const TARGETS = [
  { title: '📋 Tarefas',      order: 0 },
  { title: '🔨 Em Progresso', order: 1 },
  { title: '👀 Revisão',      order: 2 },
  { title: '✅ Concluído',    order: 3 },
];

const migrate = async () => {
  await connectDB();

  const boards = await Board.find({});
  console.log(`Found ${boards.length} board(s).`);

  let updated = 0;

  for (const board of boards) {
    const sorted = [...board.columns].sort((a, b) => a.order - b.order);

    // Preserve existing _ids in order; if board has fewer columns than targets,
    // mint new ObjectIds for the missing ones (so cards in existing columns stay linked).
    const newColumns = TARGETS.map((t, i) => ({
      _id: sorted[i]?._id ?? new mongoose.Types.ObjectId().toString(),
      title: t.title,
      order: t.order,
    }));

    // Edge case: board has MORE than 4 columns — collapse extras into the last (Concluído).
    // Cards in those extra columns get reassigned to the last column to avoid orphans.
    if (sorted.length > TARGETS.length) {
      const Card = (await import('../models/Card')).default;
      const overflow = sorted.slice(TARGETS.length);
      const lastId = newColumns[newColumns.length - 1]._id;
      for (const col of overflow) {
        await Card.updateMany({ columnId: col._id }, { $set: { columnId: lastId } });
      }
      console.log(`  · Board "${board.title}": collapsed ${overflow.length} extra column(s) into Concluído`);
    }

    board.columns = newColumns as typeof board.columns;
    await board.save();
    updated++;
    console.log(`✓ Updated board: "${board.title}" (${board._id})`);
  }

  console.log(`\nDone. ${updated} board(s) migrated.`);
  await mongoose.disconnect();
  process.exit(0);
};

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
