import { User, USER_TYPE } from '../models/User.js';
import { isValidObjectId } from '../utils/objectId.js';
import { handleUserError } from '../utils/mongooseError.js';
import { isValidEmailFormat } from '../utils/email.js';
import { ensureHashedPassword } from '../utils/password.js';

const ALLOWED_USER_TYPES = Object.values(USER_TYPE);

// 유저 전체 조회
export async function listUsers(_req, res) {
  const users = await User.find().sort({ createdAt: -1 });
  res.json({ users });
}

// 유저 단일 조회
export async function getUserById(req, res) {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: 'Invalid id' });
  }
  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }
  res.json({ user });
}

// 유저 생성
export async function createUser(req, res) {
  const { email, name, password, user_type, address } = req.body;

  const trimmedEmail = typeof email === 'string' ? email.trim() : '';
  const trimmedName = typeof name === 'string' ? name.trim() : '';
  const trimmedAddress =
    typeof address === 'string' && address.trim() ? address.trim() : null;

  if (!trimmedEmail || !trimmedName || !password || !user_type) {
    return res.status(400).json({
      message: 'email, name, password, and user_type are required',
    });
  }

  if (!isValidEmailFormat(trimmedEmail)) {
    return res.status(400).json({
      message: 'Invalid email format. Use something like user@example.com',
    });
  }

  if (!ALLOWED_USER_TYPES.includes(user_type)) {
    return res.status(400).json({
      message: `user_type must be one of: ${ALLOWED_USER_TYPES.join(', ')}`,
    });
  }

  try {
    const hashedPassword = await ensureHashedPassword(String(password));
    const user = await User.create({
      email: trimmedEmail,
      name: trimmedName,
      password: hashedPassword,
      user_type,
      address: trimmedAddress,
    });
    const userSafe = user.toObject({ getters: true, virtuals: false });
    delete userSafe.password;
    res.status(201).json({ user: userSafe });
  } catch (err) {
    return handleUserError(err, res);
  }
}

// 유저 수정
export async function updateUser(req, res) {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: 'Invalid id' });
  }

  const { email, name, password, user_type, address } = req.body;
  const updates = {};

  if (email !== undefined) {
    const trimmed = typeof email === 'string' ? email.trim() : '';
    if (!isValidEmailFormat(trimmed)) {
      return res.status(400).json({
        message: 'Invalid email format. Use something like user@example.com',
      });
    }
    updates.email = trimmed;
  }
  if (name !== undefined) updates.name = name;
  if (password !== undefined) {
    updates.password = await ensureHashedPassword(String(password));
  }
  if (user_type !== undefined) {
    if (!ALLOWED_USER_TYPES.includes(user_type)) {
      return res.status(400).json({
        message: `user_type must be one of: ${ALLOWED_USER_TYPES.join(', ')}`,
      });
    }
    updates.user_type = user_type;
  }
  if (address !== undefined) updates.address = address;

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ message: 'No fields to update' });
  }

  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ user });
  } catch (err) {
    return handleUserError(err, res);
  }
}

/** 관리자: 임시 비밀번호로 초기화 */
export async function resetUserPassword(req, res) {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: 'Invalid id' });
  }

  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  const temporary_password = '11111';
  user.password = temporary_password;
  try {
    await user.save();
    const userSafe = user.toObject({ getters: true, virtuals: false });
    delete userSafe.password;
    res.json({ user: userSafe, temporary_password });
  } catch (err) {
    return handleUserError(err, res);
  }
}

// 유저 삭제
export async function deleteUser(req, res) {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: 'Invalid id' });
  }

  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }
  res.status(204).send();
}