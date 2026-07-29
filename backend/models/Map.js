import mongoose from 'mongoose';

const mapSchema = new mongoose.Schema({
    map_id: { type: Number, default: 1 },
    floor_name: { type: String, required: true },
    image_path: { type: String, required: true },
    width: { type: Number, default: 0 },
    height: { type: Number, default: 0 }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

mapSchema.set('toJSON', {
    virtuals: true,
    transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
    }
});

export default mongoose.model('Map', mapSchema);
