import { Schema, model, type InferSchemaType, type HydratedDocument } from "mongoose";

const userSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ["admin", "user"],
      default: "user",
      required: true,
    },
    isEmailVerified: { type: Boolean, default: false, required: true },

    emailVerificationTokenHash: { type: String, default: null },
    emailVerificationExpiresAt: { type: Date, default: null },

    passwordResetTokenHash: { type: String, default: null },
    passwordResetExpiresAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export type UserDoc = HydratedDocument<InferSchemaType<typeof userSchema>>;

export const User = model("User", userSchema);
