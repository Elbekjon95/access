import mongoose from 'mongoose';

const mapBarrierSchema = new mongoose.Schema({
    map_id: { type: Number, default: 1 },
    barrier_data: { type: mongoose.Schema.Types.Mixed, required: true }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

mapBarrierSchema.set('toJSON', {
    virtuals: true,
    transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
    }
});

export default mongoose.model('MapBarrier', mapBarrierSchema);
