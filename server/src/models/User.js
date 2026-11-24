import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const { Schema, model } = mongoose;

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name must be 100 characters or fewer'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
    },
  },
  {
    timestamps: true,
  }
);

// ---------------------------------------------------------------------------
// Pre-save hook — hash password whenever it is set or modified
// ---------------------------------------------------------------------------
userSchema.pre('save', async function hashPassword(next) {
  // passwordHash stores the plaintext password before first hash, or the new
  // plaintext value when the caller sets it again.  We only re-hash when the
  // field is modified and the stored value is NOT already a bcrypt hash.
  if (!this.isModified('passwordHash')) return next();

  // Avoid double-hashing if the value already looks like a bcrypt hash
  const isBcryptHash = /^\$2[aby]\$\d+\$/.test(this.passwordHash);
  if (isBcryptHash) return next();

  try {
    const salt = await bcrypt.genSalt(12);
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
    return next();
  } catch (err) {
    return next(err);
  }
});

// ---------------------------------------------------------------------------
// Instance method — compare a plaintext password against the stored hash
// ---------------------------------------------------------------------------
userSchema.methods.comparePassword = async function comparePassword(password) {
  return bcrypt.compare(password, this.passwordHash);
};

// ---------------------------------------------------------------------------
// Never expose the password hash in JSON responses
// ---------------------------------------------------------------------------
userSchema.set('toJSON', {
  transform(_doc, ret) {
    delete ret.passwordHash;
    return ret;
  },
});

const User = model('User', userSchema);

export default User;
