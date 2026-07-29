import mongoose from 'mongoose';

const complaintSchema = new mongoose.Schema({
    full_name: { type: String, default: null },
    contact: { type: String, default: null },
    message: { type: String, required: true },
    status: { type: String, enum: ['new', 'seen', 'resolved'], default: 'new' }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

complaintSchema.set('toJSON', {
    virtuals: true,
    transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
    }
});

export default mongoose.model('Complaint', complaintSchema);
