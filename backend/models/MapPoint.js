import mongoose from 'mongoose';

const mapPointSchema = new mongoose.Schema({
    map_id: { type: Number, default: 1 },
    name: { type: String, required: true },
    type: { 
        type: String, 
        enum: ['gate', 'fids', 'toilet', 'reception', 'other', 'kiosk_start', 'entrance', 'exit', 'cafe', 'restaurant', 'info', 'counter', 'mosque', 'shop', 'cip', 'vip'], 
        default: 'other' 
    },
    pos_x: { type: Number, required: true },
    pos_y: { type: Number, required: true }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

mapPointSchema.set('toJSON', {
    virtuals: true,
    transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
    }
});

export default mongoose.model('MapPoint', mapPointSchema);
