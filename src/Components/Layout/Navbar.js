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
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [mobileDropdownOpen, setMobileDropdownOpen] = useState(null);
    const menuRef = useRef(null);
    const usersDropdownRef = useRef(null);
    const systemDropdownRef = useRef(null);
    const mobileMenuRef = useRef(null);
    const mobileMenuButtonRef = useRef(null);
    const usersDropdownTimeoutRef = useRef(null);
    const systemDropdownTimeoutRef = useRef(null);

    // Close menus when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setShowUserMenu(false);
            }
            if (usersDropdownRef.current && !usersDropdownRef.current.contains(event.target)) {
                // Clear timeout if clicking outside
                if (usersDropdownTimeoutRef.current) {
                    clearTimeout(usersDropdownTimeoutRef.current);
                    usersDropdownTimeoutRef.current = null;
                }
                setShowUsersDropdown(false);
            }
            if (systemDropdownRef.current && !systemDropdownRef.current.contains(event.target)) {
                // Clear timeout if clicking outside
                if (systemDropdownTimeoutRef.current) {
                    clearTimeout(systemDropdownTimeoutRef.current);
                    systemDropdownTimeoutRef.current = null;
                }
                setShowSystemDropdown(false);
            }
        };

        const handleMobileMenuClickOutside = (event) => {
            // Check if click is on mobile menu button or inside menu - don't close if it is
            const isMobileMenuButton = mobileMenuButtonRef.current?.contains(event.target);
            const isInsideMobileMenu = mobileMenuRef.current?.contains(event.target);
            
            if (mobileMenuOpen && !isMobileMenuButton && !isInsideMobileMenu) {
                setMobileMenuOpen(false);
                setMobileDropdownOpen(null);
            }
        };

        // Use click instead of mousedown to allow menu item clicks to register first
        document.addEventListener('click', handleClickOutside);
        document.addEventListener('click', handleMobileMenuClickOutside);
        
        return () => {
            document.removeEventListener('click', handleClickOutside);
            document.removeEventListener('click', handleMobileMenuClickOutside);
            // Clean up timeouts on unmount
            if (usersDropdownTimeoutRef.current) {
                clearTimeout(usersDropdownTimeoutRef.current);
            }
            if (systemDropdownTimeoutRef.current) {
                clearTimeout(systemDropdownTimeoutRef.current);
            }
        };
    }, [mobileMenuOpen]);

    // Close mobile menu when route changes
    useEffect(() => {
        setMobileMenuOpen(false);
        setMobileDropdownOpen(null);
    }, [location.pathname]);

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

    const isLinkActive = (link) => {
        if (link.dropdown) {
            return link.dropdown.some(subLink =>
                location.pathname === subLink.path ||
                location.pathname.startsWith(subLink.path + '/')
            );
        }
        return location.pathname === link.path ||
            location.pathname.startsWith(link.path + '/');
    };

    const isSubLinkActive = (subLink) => {
        return location.pathname === subLink.path ||
            location.pathname.startsWith(subLink.path + '/');
    };

    const toggleMobileDropdown = (linkName) => {
        setMobileDropdownOpen(mobileDropdownOpen === linkName ? null : linkName);
    };

    const navLinks = getNavLinks();

    return (
        <nav className="bg-white shadow-md border-b border-gray-200 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    {/* Logo */}
                    <div className="flex items-center">
                        <Link
                            to={user?.role === 'admin' ? '/admin/dashboard' : user?.role === 'manager' ? '/manager/dashboard' : '/investor/dashboard'}
                            className="flex items-center space-x-2 group"
                        >
                            <div className="flex-shrink-0">
                                <div className="h-10 w-10 bg-gradient-to-br from-primary-600 to-primary-700 rounded-lg flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
                                    <span className="text-white font-bold text-lg">Z</span>
                                </div>
                            </div>
                            <span className="text-xl font-bold text-gray-900 group-hover:text-primary-600 transition-colors">
                                ZRS CRM
                            </span>
                        </Link>
                    </div>

                    {/* Desktop Navigation */}
                    <div className="hidden lg:flex lg:items-center lg:space-x-1 flex-1 justify-center">
                        {navLinks.map((link) => {
                            if (link.dropdown) {
                                const isUsersDropdown = link.name === 'Users';
                                const showDropdown = isUsersDropdown ? showUsersDropdown : showSystemDropdown;
                                const setShowDropdown = isUsersDropdown ? setShowUsersDropdown : setShowSystemDropdown;
                                const dropdownRef = isUsersDropdown ? usersDropdownRef : systemDropdownRef;
                                const isActive = isLinkActive(link);

                                // Handle dropdown with delay
                                const handleMouseEnter = () => {
                                    // Clear any pending timeout
                                    if (isUsersDropdown) {
                                        if (usersDropdownTimeoutRef.current) {
                                            clearTimeout(usersDropdownTimeoutRef.current);
                                            usersDropdownTimeoutRef.current = null;
                                        }
                                    } else {
                                        if (systemDropdownTimeoutRef.current) {
                                            clearTimeout(systemDropdownTimeoutRef.current);
                                            systemDropdownTimeoutRef.current = null;
                                        }
                                    }
                                    setShowDropdown(true);
                                };

                                const handleMouseLeave = () => {
                                    // Set timeout to close dropdown after delay
                                    const timeoutRef = isUsersDropdown ? usersDropdownTimeoutRef : systemDropdownTimeoutRef;
                                    timeoutRef.current = setTimeout(() => {
                                        setShowDropdown(false);
                                        timeoutRef.current = null;
                                    }, 300); // 300ms delay
                                };

                                return (
                                    <div
                                        key={link.path}
                                        className="relative"
                                        onMouseEnter={handleMouseEnter}
                                        onMouseLeave={handleMouseLeave}
                                        ref={dropdownRef}
                                    >
                                        <button
                                            className={`relative px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                                                isActive
                                                    ? 'text-primary-600 bg-primary-50'
                                                    : 'text-gray-700 hover:text-primary-600 hover:bg-gray-50'
                                            }`}
                                        >
                                            {link.name}
                                            <svg
                                                className={`ml-1.5 w-4 h-4 inline-block transition-transform duration-200 ${
                                                    showDropdown ? 'rotate-180' : ''
                                                }`}
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </button>
                                        {showDropdown && (
                                            <div className="absolute left-0 top-full mt-2 w-56 rounded-lg shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50 overflow-hidden">
                                                <div className="py-1">
                                                    {link.dropdown.map((subLink) => {
                                                        const isSubActive = isSubLinkActive(subLink);
                                                        return (
                                                            <Link
                                                                key={subLink.path}
                                                                to={subLink.path}
                                                                className={`block px-4 py-2.5 text-sm transition-colors ${
                                                                    isSubActive
                                                                        ? 'bg-primary-50 text-primary-700 font-medium border-l-2 border-primary-600'
                                                                        : 'text-gray-700 hover:bg-gray-50 hover:text-primary-600'
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

                            const isActive = isLinkActive(link);
                            return (
                                <Link
                                    key={link.path}
                                    to={link.path}
                                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                                        isActive
                                            ? 'text-primary-600 bg-primary-50'
                                            : 'text-gray-700 hover:text-primary-600 hover:bg-gray-50'
                                    }`}
                                >
                                    {link.name}
                                </Link>
                            );
                        })}
                    </div>

                    {/* User Menu & Mobile Menu Button */}
                    <div className="flex items-center space-x-4">
                        {/* Desktop User Menu */}
                        <div className="hidden lg:block relative" ref={menuRef}>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowUserMenu(!showUserMenu);
                                }}
                                className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                            >
                                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary-600 to-primary-700 flex items-center justify-center text-white font-semibold shadow-sm">
                                    {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                                </div>
                                <div className="text-left hidden xl:block">
                                    <div className="text-sm font-medium text-gray-900">{user?.name}</div>
                                    <div className="text-xs text-gray-500 capitalize">{user?.role}</div>
                                </div>
                                <svg
                                    className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
                                        showUserMenu ? 'rotate-180' : ''
                                    }`}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>

                            {showUserMenu && (
                                <div 
                                    className="absolute right-0 mt-2 w-64 rounded-lg shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50 overflow-hidden"
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                                        <div className="flex items-center space-x-3">
                                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary-600 to-primary-700 flex items-center justify-center text-white font-semibold">
                                                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-medium text-gray-900 truncate">{user?.name}</div>
                                                <div className="text-xs text-gray-500 truncate">{user?.email}</div>
                                                <div className="text-xs text-primary-600 capitalize mt-0.5">{user?.role}</div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="py-1">
                                        {user?.role === 'admin' && (
                                            <Link
                                                to="/admin/profile"
                                                className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary-600 transition-colors flex items-center space-x-2"
                                                onClick={() => setShowUserMenu(false)}
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                </svg>
                                                <span>Profile</span>
                                            </Link>
                                        )}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleLogout();
                                            }}
                                            className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors flex items-center space-x-2"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                            </svg>
                                            <span>Sign out</span>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Mobile User Avatar */}
                        <div className="lg:hidden relative" ref={menuRef}>
                            <button
                                onClick={() => setShowUserMenu(!showUserMenu)}
                                className="h-9 w-9 rounded-full bg-gradient-to-br from-primary-600 to-primary-700 flex items-center justify-center text-white font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                            >
                                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                            </button>

                            {showUserMenu && (
                                <div className="absolute right-0 mt-2 w-64 rounded-lg shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50 overflow-hidden">
                                    <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                                        <div className="flex items-center space-x-3">
                                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary-600 to-primary-700 flex items-center justify-center text-white font-semibold">
                                                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-medium text-gray-900 truncate">{user?.name}</div>
                                                <div className="text-xs text-gray-500 truncate">{user?.email}</div>
                                                <div className="text-xs text-primary-600 capitalize mt-0.5">{user?.role}</div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="py-1">
                                        {user?.role === 'admin' && (
                                            <Link
                                                to="/admin/profile"
                                                className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary-600 transition-colors flex items-center space-x-2"
                                                onClick={() => setShowUserMenu(false)}
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                </svg>
                                                <span>Profile</span>
                                            </Link>
                                        )}
                                        <button
                                            onClick={handleLogout}
                                            className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors flex items-center space-x-2"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                            </svg>
                                            <span>Sign out</span>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Mobile Menu Button */}
                        <button
                            ref={mobileMenuButtonRef}
                            onClick={(e) => {
                                e.stopPropagation();
                                setMobileMenuOpen(!mobileMenuOpen);
                            }}
                            className="lg:hidden p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                            aria-label="Toggle menu"
                        >
                            {mobileMenuOpen ? (
                                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            ) : (
                                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu */}
            {mobileMenuOpen && (
                <div className="lg:hidden border-t border-gray-200 bg-white" ref={mobileMenuRef}>
                    <div className="px-4 pt-2 pb-4 space-y-1">
                        {navLinks.map((link) => {
                            if (link.dropdown) {
                                const isOpen = mobileDropdownOpen === link.name;
                                const isActive = isLinkActive(link);

                                return (
                                    <div key={link.path} className="space-y-1">
                                        <button
                                            onClick={() => toggleMobileDropdown(link.name)}
                                            className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                                                isActive
                                                    ? 'text-primary-600 bg-primary-50'
                                                    : 'text-gray-700 hover:text-primary-600 hover:bg-gray-50'
                                            }`}
                                        >
                                            <span>{link.name}</span>
                                            <svg
                                                className={`w-4 h-4 transition-transform duration-200 ${
                                                    isOpen ? 'rotate-180' : ''
                                                }`}
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </button>
                                        {isOpen && (
                                            <div className="pl-4 space-y-1">
                                                {link.dropdown.map((subLink) => {
                                                    const isSubActive = isSubLinkActive(subLink);
                                                    return (
                                                        <Link
                                                            key={subLink.path}
                                                            to={subLink.path}
                                                            className={`block px-4 py-2.5 text-sm rounded-lg transition-colors ${
                                                                isSubActive
                                                                    ? 'bg-primary-50 text-primary-700 font-medium border-l-2 border-primary-600'
                                                                    : 'text-gray-600 hover:bg-gray-50 hover:text-primary-600'
                                                            }`}
                                                        >
                                                            {subLink.name}
                                                        </Link>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            }

                            const isActive = isLinkActive(link);
                            return (
                                <Link
                                    key={link.path}
                                    to={link.path}
                                    className={`block px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                                        isActive
                                            ? 'text-primary-600 bg-primary-50'
                                            : 'text-gray-700 hover:text-primary-600 hover:bg-gray-50'
                                    }`}
                                >
                                    {link.name}
                                </Link>
                            );
                        })}
                    </div>
                </div>
            )}
        </nav>
    );
};

export default Navbar;
