import { useState } from "react";
import { useAuth } from "../hooks/auth/authContext";
// import { useApp } from "../hooks/app/appContext";
import { HiMenuAlt2 } from "react-icons/hi";

interface HeaderProps {
  onMenuClick: () => void; // Prop para abrir el sidebar
}

function Header({ onMenuClick }: HeaderProps) {
  const { handleLogout ,authState } = useAuth();
  // const { pageTitle } = useApp();

  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <nav className="fixed top-0 z-50 w-full bg-[var(--dark-blue)] text-[var(--white)] shadow-lg">
      <div className="px-3 py-5 lg:px-5 lg:pl-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center justify-start">
            {/* <span className="self-center text-xl font-semibold sm:text-2xl whitespace-nowrap dark:text-white pl-5">
              {pageTitle}
            </span> */}
            <button
              onClick={onMenuClick}
              className="p-2 mr-3 text-gray-400 rounded-lg lg:hidden hover:bg-blue-900 focus:outline-none"
            >
              <HiMenuAlt2 className="w-6 h-6" />
            </button>
            
            <h2 className="uppercase text-xl sm:text-3xl font-bold">
              <span className="text-[var(--ultra-light-blue)]">M</span>onarca
            </h2>
          </div>
          <div className="flex items-center">
            <div className="flex items-center ms-3 relative">
              <button
                type="button"
                className="flex text-sm bg-[var(--ultra-light-blue)] p-2 rounded-full focus:ring-4 focus:ring-blue-800"
                onClick={() => setDropdownOpen(!dropdownOpen)}
              >
                <span className="font-bold">
                  {/* Usamos el operador && y un fallback 'U' por si el nombre no existe */}
                  {(authState?.userName && authState.userName[0]) || 'U'}
                  {(authState?.userLastName && authState.userLastName[0]) || ''}
                </span>
              </button>
              
              {dropdownOpen &&
                <div
                  className="z-50 absolute top-[110%] right-0 min-w-[200px] my-4 text-base list-none bg-[var(--blue)] divide-y divide-blue-800 rounded-lg shadow-2xl"
                >
                  <div className="px-4 py-3">
                    <p className="text-sm text-white font-bold truncate">
                    {authState.userName} {authState.userLastName}
                    </p>
                    <p className="text-xs text-gray-300 truncate">
                     {authState.userEmail}

                    </p>
                    <p className="text-xs font-bold text-[var(--ultra-light-blue)] mt-1">
                     {authState.userRole}

                    </p>
                  </div>
                  <ul className="py-1">
                    <li>
                      <button 
                       onClick={handleLogout}
                        className="block px-4 py-2 text-sm w-full text-left text-white hover:bg-blue-800 transition-colors"
                      >
                        Cerrar Sesión
                      </button>
                    </li>
                  </ul>
                </div>
              }
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Header;
