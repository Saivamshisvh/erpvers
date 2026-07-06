export default function Navbar() {
    return (
      <nav className="w-full bg-white shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
  
          {/* Logo */}
          <h1 className="text-2xl font-bold text-blue-600">
            ERPVers
          </h1>
  
          {/* Navigation */}
          <ul className="hidden md:flex gap-8 text-gray-700 font-medium">
            <li className="hover:text-blue-600 cursor-pointer">Home</li>
            <li className="hover:text-blue-600 cursor-pointer">Services</li>
            <li className="hover:text-blue-600 cursor-pointer">Solutions</li>
            <li className="hover:text-blue-600 cursor-pointer">About</li>
            <li className="hover:text-blue-600 cursor-pointer">Contact</li>
          </ul>
  
          {/* Button */}
          <button className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 transition">
            Get Quote
          </button>
  
        </div>
      </nav>
    );
  }