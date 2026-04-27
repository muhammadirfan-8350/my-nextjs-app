import bcrypt from 'bcryptjs';
import { NextApiRequest, NextApiResponse } from 'next';
//import bcrypt from 'bcrypt'; // Install bcrypt to hash and compare passwords
import prisma from '../../../lib/prisma'; // Your Prisma client for database interaction
import { createToken, createAuthHeaderValue } from '../../../lib/auth'; // Functions to generate JWT token

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { email, password } = req.body;

  // Check if email and password are provided
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    // Get user from database by email
    const user = await prisma.user.findUnique({ where: { email } });

    // If user is not found, send invalid credentials response
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Compare the entered password with the hashed password in the database
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    // If password is invalid, return an error
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Create a JWT token for the authenticated user
    const token = createToken({ email: user.email, name: user.name, role: user.role });

    // Set the token as a HttpOnly cookie
    res.setHeader('Set-Cookie', createAuthHeaderValue(token));

    // Send user info and token in the response
    return res.status(200).json({
      user: { email: user.email, name: user.name, role: user.role },
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Unable to sign in. Please try again later.' });
  }
}