import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAppSelector } from '@/store';
import { selectUser } from '@/store/userSlice';

const Sidebar: React.FC = () => {
  const user = useAppSelector(selectUser);

  return (
    <nav className="sidebar">
      <ul>
        <li>
          <NavLink to="/" end className={({ isActive }) => isActive ? 'active' : ''}>
            Home
          </NavLink>
        </li>
        {user && (
          <>
            <li>
              <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'active' : ''}>
                Dashboard
              </NavLink>
            </li>
            <li>
              <NavLink to="/profile" className={({ isActive }) => isActive ? 'active' : ''}>
                Profile
              </NavLink>
            </li>
            {user.role === 'admin' && (
              <li>
                <NavLink to="/admin" className={({ isActive }) => isActive ? 'active' : ''}>
                  Admin
                </NavLink>
              </li>
            )}
          </>
        )}
        {!user && (
          <>
            <li>
              <NavLink to="/login" className={({ isActive }) => isActive ? 'active' : ''}>
                Login
              </NavLink>
            </li>
            <li>
              <NavLink to="/register" className={({ isActive }) => isActive ? 'active' : ''}>
                Register
              </NavLink>
            </li>
          </>
        )}
      </ul>
    </nav>
  );
};

export default Sidebar;