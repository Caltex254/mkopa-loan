import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword, generateToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fullName, phone, email, password } = body;

    // Validate all fields are present
    if (!fullName || !phone || !email || !password) {
      return NextResponse.json(
        { error: 'All fields are required: fullName, phone, email, password' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate password length
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    // Check if phone or email already exists
    const existingUser = await db.user.findFirst({
      where: {
        OR: [{ phone }, { email }],
      },
    });

    if (existingUser) {
      if (existingUser.phone === phone) {
        return NextResponse.json(
          { error: 'Phone number already registered' },
          { status: 409 }
        );
      }
      if (existingUser.email === email) {
        return NextResponse.json(
          { error: 'Email already registered' },
          { status: 409 }
        );
      }
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user in database
    const user = await db.user.create({
      data: {
        fullName,
        phone,
        email,
        passwordHash,
        role: 'user',
        isActive: true,
      },
    });

    // Generate JWT token
    const token = generateToken({ userId: user.id, role: user.role });

    // Prepare user data without password
    const userData = {
      id: user.id,
      fullName: user.fullName,
      phone: user.phone,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
    };

    // Set HTTP-only cookie and return response
    const response = NextResponse.json(
      {
        message: 'Registration successful',
        user: userData,
        token,
      },
      { status: 201 }
    );

    response.cookies.set('mkopa-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error. Please try again later.' },
      { status: 500 }
    );
  }
}
