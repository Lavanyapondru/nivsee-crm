import { Link } from "react-router-dom";

function Navbar() {
  return (
    <nav className="navbar navbar-expand-lg navbar-dark main-navbar sticky-top">
      <div className="container">
        {/* <Link
          to="/"
          className="navbar-brand d-flex align-items-center gap-2"
        >
          <img
            src="/logos/nivsee.webp"
            alt="Nivsee"
            className="nav-logo"
          />
        </Link> */}
      </div>
    </nav>
  );
}

export default Navbar;