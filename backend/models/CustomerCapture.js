import mongoose from 'mongoose';

const customerCaptureSchema = new mongoose.Schema({
    image_path: { type: String, required: true }
}, {
    timestamps: { createdAt: 'captured_at', updatedAt: 'updated_at' }
});

customerCaptureSchema.set('toJSON', {
    virtuals: true,
    transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
    }
});

export default mongoose.model('CustomerCapture', customerCaptureSchema);
