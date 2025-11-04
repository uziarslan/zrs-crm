import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../Context/AuthContext';

const Navbar = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [showUsersDropdown, setShowUsersDropdown] = useState(false);
    const [showSystemDropdown, setShowSystemDropdown] = useState(false);
    const menuRef = useRef(null);
    const usersDropdownRef = useRef(null);
    const systemDropdownRef = useRef(null);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setShowUserMenu(false);
            }
        };

        if (showUserMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showUserMenu]);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const getNavLinks = () => {
        if (user?.role === 'admin') {
            return [
                {
                    name: 'Users',
                    path: '/admin/users',
                    dropdown: [
                        { name: 'Managers', path: '/admin/managers' },
                        { name: 'Investors', path: '/admin/investors' }
                    ]
                },
                { name: 'Purchases', path: '/purchases/leads' },
                { name: 'Negotiation', path: '/purchases/negotiation' },
                { name: 'Inspection', path: '/purchases/inspection' },
                { name: 'Inventory', path: '/purchases/inventory' },
                { name: 'Sales', path: '/sales/leads' },
                { name: 'Sold', path: '/sales/sold' },
                {
                    name: 'System',
                    path: '/system',
                    dropdown: [
                        { name: 'CSA', path: '/csa/dashboard' },
                        { name: 'Audit Logs', path: '/admin/audit-logs' }
                    ]
                },
            ];
        } else if (user?.role === 'manager') {
            return [
                { name: 'Purchase Leads', path: '/purchases/leads' },
                { name: 'Negotiation', path: '/purchases/negotiation' },
                { name: 'Inspection', path: '/purchases/inspection' },
                { name: 'Inventory', path: '/purchases/inventory' },
                { name: 'Sales Leads', path: '/sales/leads' },
                { name: 'CSA Tickets', path: '/csa/tickets' },
            ];
        } else if (user?.role === 'investor') {
            return [
                { name: 'SOA', path: '/investor/soa' },
                { name: 'My Inventory', path: '/investor/inventory' },
            ];
        }
        return [];
    };

    return (
        <nav className="bg-white shadow-lg">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex">
                        <div className="flex-shrink-0 flex items-center">
                            <Link
                                to={user?.role === 'admin' ? '/admin/dashboard' : user?.role === 'manager' ? '/manager/dashboard' : '/investor/dashboard'}
                                className="text-2xl font-bold text-primary-600 hover:text-primary-700 transition-colors cursor-pointer"
                            >
                                ZRS CRM
                            </Link>
                        </div>
                        <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                            {getNavLinks().map((link) => {
                                // Check if link has dropdown
                                if (link.dropdown) {
                                    const isActive = link.dropdown.some(subLink =>
                                        location.pathname === subLink.path ||
                                        location.pathname.startsWith(subLink.path + '/')
                                    );

                                    // Determine which dropdown state to use
                                    const isUsersDropdown = link.name === 'Users';
                                    const showDropdown = isUsersDropdown ? showUsersDropdown : showSystemDropdown;
                                    const setShowDropdown = isUsersDropdown ? setShowUsersDropdown : setShowSystemDropdown;
                                    const dropdownRef = isUsersDropdown ? usersDropdownRef : systemDropdownRef;

                                    return (
                                        <div
                                            key={link.path}
                                            className="relative"
                                            onMouseEnter={() => setShowDropdown(true)}
                                            onMouseLeave={() => setShowDropdown(false)}
                                            ref={dropdownRef}
                                        >
                                            <button
                                                className={`inline-flex items-center px-1 pt-1 text-sm font-medium border-b-2 transition-colors h-16 ${isActive
                                                    ? 'text-primary-600 border-primary-600'
                                                    : 'text-gray-900 hover:text-primary-600 border-transparent hover:border-primary-600'
                                                    }`}
                                            >
                                                {link.name}
                                                <svg className="ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </button>
                                            {showDropdown && (
                                                <div className="absolute left-0 top-full mt-0 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
                                                    <div className="py-1">
                                                        {link.dropdown.map((subLink) => {
                                                            const isSubActive = location.pathname === subLink.path ||
                                                                location.pathname.startsWith(subLink.path + '/');
                                                            return (
                                                                <Link
                                                                    key={subLink.path}
                                                                    to={subLink.path}
                                                                    className={`block px-4 py-2 text-sm transition-colors ${isSubActive
                                                                        ? 'bg-primary-50 text-primary-700 font-medium'
                                                                        : 'text-gray-700 hover:bg-gray-100'
                                                                        }`}
                                                                >
                                                                    {subLink.name}
                                                                </Link>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                }

                                // Regular link without dropdown
                                const isActive = location.pathname === link.path ||
                                    location.pathname.startsWith(link.path + '/');

                                return (
                                    <Link
                                        key={link.path}
                                        to={link.path}
                                        className={`inline-flex items-center px-1 pt-1 text-sm font-medium border-b-2 transition-colors ${isActive
                                            ? 'text-primary-600 border-primary-600'
                                            : 'text-gray-900 hover:text-primary-600 border-transparent hover:border-primary-600'
                                            }`}
                                    >
                                        {link.name}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>

                    <div className="flex items-center">
                        <div className="relative" ref={menuRef}>
                            <button
                                onClick={() => setShowUserMenu(!showUserMenu)}
                                className="flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                            >
                                <div className="h-10 w-10 rounded-full bg-primary-600 flex items-center justify-center text-white font-bold">
                                    {user?.name?.charAt(0) || 'U'}
                                </div>
                                <div className="ml-3 text-left">
                                    <div className="text-sm font-medium text-gray-700">{user?.name}</div>
                                    <div className="text-xs text-gray-500 capitalize">{user?.role}</div>
                                </div>
                            </button>

                            {showUserMenu && (
                                <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 z-50">
                                    <div className="px-4 py-2 text-xs text-gray-500 border-b">{user?.email}</div>
                                    <button
                                        onClick={handleLogout}
                                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                    >
                                        Sign out
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;

