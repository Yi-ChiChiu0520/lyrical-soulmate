// Mock axios
jest.mock('axios', () => ({
    post: jest.fn(() => Promise.resolve({ data: 'Login successful' }))
}));

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter as Router } from 'react-router-dom';
import Auth from './Auth';
import axios from 'axios';

describe('Auth Component', () => {
    beforeEach(() => {
        jest.clearAllMocks(); // Clear all mocks before each test
    });
    test('displays error when username is already taken during sign up', async () => {
        // Mock axios.post to reject with an error
        axios.post.mockRejectedValueOnce(new Error('Username already taken'));

        render(
            <Router>
                <Auth />
            </Router>
        );

        // Fill out the form
        fireEvent.change(screen.getByPlaceholderText('Username'), { target: { value: 'testuser' } });
        fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'Password1' } });
        fireEvent.change(screen.getByPlaceholderText('Confirm Password'), { target: { value: 'Password1' } });

        // Submit the form
        fireEvent.click(screen.getByRole('button', { name: 'Sign Up' }));

        // Check that the error message is displayed
        expect(await screen.findByText('Username already taken or server error')).toBeInTheDocument();
    });
    test('renders sign up form by default', () => {
        render(
            <Router>
                <Auth />
            </Router>
        );
        // Use getByRole to target the heading
        expect(screen.getByRole('heading', { name: 'Sign Up' })).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Username')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Confirm Password')).toBeInTheDocument();
    });

    test('switches to login form when toggle button is clicked', () => {
        render(
            <Router>
                <Auth />
            </Router>
        );
        // Use getByRole to target the toggle button
        fireEvent.click(screen.getByRole('button', { name: 'Already have an account? Login' }));
        // Use getByRole to target the heading
        expect(screen.getByRole('heading', { name: 'Login' })).toBeInTheDocument();
        expect(screen.queryByPlaceholderText('Confirm Password')).not.toBeInTheDocument();
    });

    test('displays error when passwords do not match during sign up', async () => {
        render(
            <Router>
                <Auth />
            </Router>
        );
        fireEvent.change(screen.getByPlaceholderText('Username'), { target: { value: 'testuser' } });
        fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'Password1' } });
        fireEvent.change(screen.getByPlaceholderText('Confirm Password'), { target: { value: 'Password2' } });
        // Use getByRole to target the submit button
        fireEvent.click(screen.getByRole('button', { name: 'Sign Up' }));

        expect(await screen.findByText('Passwords do not match')).toBeInTheDocument();
    });

    test('displays error when password does not meet requirements during sign up', async () => {
        render(
            <Router>
                <Auth />
            </Router>
        );
        fireEvent.change(screen.getByPlaceholderText('Username'), { target: { value: 'testuser' } });
        fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'password' } });
        fireEvent.change(screen.getByPlaceholderText('Confirm Password'), { target: { value: 'password' } });
        // Use getByRole to target the submit button
        fireEvent.click(screen.getByRole('button', { name: 'Sign Up' }));

        expect(await screen.findByText('Password must contain at least one uppercase letter, one lowercase letter, and one number.')).toBeInTheDocument();
    });

    test('successfully signs up a new user', async () => {
        axios.post.mockResolvedValueOnce({ data: 'User created successfully' });

        render(
            <Router>
                <Auth />
            </Router>
        );
        fireEvent.change(screen.getByPlaceholderText('Username'), { target: { value: 'testuser' } });
        fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'Password1' } });
        fireEvent.change(screen.getByPlaceholderText('Confirm Password'), { target: { value: 'Password1' } });
        // Use getByRole to target the submit button
        fireEvent.click(screen.getByRole('button', { name: 'Sign Up' }));

        expect(await screen.findByText('User created successfully')).toBeInTheDocument();
    });

    test('displays error when login fails', async () => {
        axios.post.mockRejectedValueOnce(new Error('Invalid username or password'));

        render(
            <Router>
                <Auth />
            </Router>
        );
        // Use getByRole to target the toggle button
        fireEvent.click(screen.getByRole('button', { name: 'Already have an account? Login' }));
        fireEvent.change(screen.getByPlaceholderText('Username'), { target: { value: 'testuser' } });
        fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'wrongpassword' } });
        // Use getByRole to target the submit button
        fireEvent.click(screen.getByRole('button', { name: 'Login' }));

        expect(await screen.findByText('Invalid username or password')).toBeInTheDocument();
    });

    test('successfully logs in a user and navigates to dashboard', async () => {
        axios.post.mockResolvedValueOnce({ data: 'Login successful' });

        render(
            <Router>
                <Auth />
            </Router>
        );
        // Use getByRole to target the toggle button
        fireEvent.click(screen.getByRole('button', { name: 'Already have an account? Login' }));
        fireEvent.change(screen.getByPlaceholderText('Username'), { target: { value: 'testuser' } });
        fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'Password1' } });
        // Use getByRole to target the submit button
        fireEvent.click(screen.getByRole('button', { name: 'Login' }));

        expect(await screen.findByText('Login successful')).toBeInTheDocument();
        expect(window.location.pathname).toBe('/dashboard');
    });
});