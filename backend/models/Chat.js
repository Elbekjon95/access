import mongoose from 'mongoose';

const chatSchema = new mongoose.Schema({
    capture_id: { type: mongoose.Schema.Types.Mixed, default: null },
    user_message: { type: String, required: true },
    ai_response: { type: String, required: true },
    language: { type: String, required: true, default: 'uz' }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

chatSchema.set('toJSON', {
    virtuals: true,
    transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
    }
});

export default mongoose.model('Chat', chatSchema);
