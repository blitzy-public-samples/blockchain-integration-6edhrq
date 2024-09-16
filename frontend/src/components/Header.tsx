import React from 'react';
import { Link } from 'react-router-dom';
import { useAppSelector } from '@/store';
import { selectUser } from '@/store/userSlice';

const Header: React.FC = () => {
  const user = useAppSelector(selectUser);

  return (
    <header className="bg-gray-800 text-white p-4">
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/" className="text-2xl font-bold">
          Logo
        </Link>
        <nav>
          <ul className="flex space-x-4">
            <li><Link to="/">Home</Link></li>
            <li><Link to="/about">About</Link></li>
            <li><Link to="/contact">Contact</Link></li>
          </ul>
        </nav>
        <div>
          {user ? (
            <div className="flex items-center space-x-2">
              <span>{user.name}</span>
              <Link to="/profile" className="bg-blue-500 hover:bg-blue-600 px-3 py-1 rounded">
                Profile
              </Link>
            </div>
          ) : (
            <Link to="/login" className="bg-blue-500 hover:bg-blue-600 px-3 py-1 rounded">
              Login
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;