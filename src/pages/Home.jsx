
import { Link } from "react-router-dom";

function Home() {
  return (
    <main>

      {/* HERO SECTION */}
      <section className="hero-section">
        <div className="container">
          <div className="row align-items-center min-vh-75">

            <div className="col-lg-7 hero-content">

              <span className="hero-tag">
                <i className="bi bi-stars"></i>
                ONE CONNECTED DIGITAL WORKSPACE
              </span>

              <h1>
                Innovating Today.
                <br />
                <span>Connecting Tomorrow.</span>
              </h1>

              <p>
                Welcome to the unified digital presence of
                7iTech and Nivsee Technology Pvt. Ltd.
                Explore our companies, discover our work
                and connect with our team.
              </p>

              <div className="d-flex gap-3 flex-wrap mt-4">
                <a href="#about" className="btn primary-btn">
                  Explore More
                  <i className="bi bi-arrow-right ms-2"></i>
                </a>

                <Link to="/login" className="btn secondary-btn">
                  Employee Portal
                  <i className="bi bi-box-arrow-in-right ms-2"></i>
                </Link>
              </div>

              <div className="hero-note mt-4">
                <i className="bi bi-shield-check"></i>
                One platform. One team. One shared workspace.
              </div>

            </div>

            <div className="col-lg-5 text-center hero-visual">
              <div className="hero-glow"></div>

              <div className="hero-logo-card">
                <img
                  src="/logos/nivsee.webp"
                  alt="Nivsee Technology"
                  className="hero-nivsee"
                />

                <div className="logo-divider"></div>

                <img
                  src="/logos/7.webp"
                  alt="7iTech"
                  className="hero-itech"
                />

                <h4>Technology Together</h4>
                <p>Building connections through innovation</p>
              </div>

              <div className="floating-card floating-one">
                <i className="bi bi-people-fill"></i>
                Shared Team
              </div>

              <div className="floating-card floating-two">
                <i className="bi bi-lightning-charge-fill"></i>
                Innovation
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* ABOUT SECTION */}
      <section className="section-padding" id="about">
        <div className="container">

          <div className="section-heading text-center">
            <span>WHO WE ARE</span>
            <h2>About Our Organization</h2>
            <p>
              Two technology brands, one shared team and
              one connected business workspace.
            </p>
          </div>

          <div className="row g-4 mt-4">

            <div className="col-md-6">
              <div className="company-card h-100">
                <img
                  src="/logos/nivsee.png"
                  alt="Nivsee"
                  className="company-logo"
                />

                <h3>Nivsee Technology Pvt. Ltd.</h3>

                <p>
                  Add your official Nivsee company introduction
                  here. Describe your company background,
                  vision, mission and areas of expertise.
                </p>

                <a href="#contact">
                  Know More <i className="bi bi-arrow-right"></i>
                </a>
              </div>
            </div>

            <div className="col-md-6">
              <div className="company-card h-100">
                <img
                  src="/logos/7itech.png"
                  alt="7iTech"
                  className="company-logo"
                />

                <h3>7iTech</h3>

                <p>
                  Add your official 7iTech company introduction
                  here. Describe your services, business focus,
                  vision and technology expertise.
                </p>

                <a href="#contact">
                  Know More <i className="bi bi-arrow-right"></i>
                </a>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* SERVICES SECTION */}
      <section className="services-section section-padding" id="services">
        <div className="container">

          <div className="section-heading text-center">
            <span>WHAT WE DO</span>
            <h2>Our Services</h2>
            <p>
              Add your organization's actual services and
              technology offerings to this section.
            </p>
          </div>

          <div className="row g-4 mt-4">

            {[
              {
                icon: "bi-code-slash",
                title: "Web Development",
                description: "Add details about your web development services."
              },
              {
                icon: "bi-window",
                title: "Software Solutions",
                description: "Add details about your software solutions."
              },
              {
                icon: "bi-palette",
                title: "UI / UX Design",
                description: "Add details about your design services."
              },
              {
                icon: "bi-gear",
                title: "Technology Services",
                description: "Add details about your other IT services."
              }
            ].map((service, index) => (
              <div className="col-md-6 col-lg-3" key={index}>
                <div className="service-card h-100">
                  <div className="service-icon">
                    <i className={`bi ${service.icon}`}></i>
                  </div>

                  <h4>{service.title}</h4>
                  <p>{service.description}</p>
                </div>
              </div>
            ))}

          </div>
        </div>
      </section>

      {/* COMPANIES SECTION */}
      <section className="section-padding" id="companies">
        <div className="container text-center">

          <div className="section-heading">
            <span>OUR BRANDS</span>
            <h2>One Team, Two Brands</h2>
            <p>
              Both brands operate through one unified team
              and a shared management platform.
            </p>
          </div>

          <div className="brand-showcase mt-5">
            <img src="/logos/nivsee.png" alt="Nivsee" />
            <span className="brand-plus">+</span>
            <img src="/logos/7itech.png" alt="7iTech" />
          </div>

        </div>
      </section>

      {/* CONTACT SECTION */}
      <section className="contact-section section-padding" id="contact">
        <div className="container text-center">
          <span>LET'S CONNECT</span>
          <h2>Have a Question?</h2>
          <p>
            Get in touch with our team for business enquiries
            and further information.
          </p>

          {/* Replace with your official company email */}
          <a
            href="mailto:your-company-email@example.com"
            className="btn primary-btn mt-3"
          >
            Contact Us
            <i className="bi bi-arrow-right ms-2"></i>
          </a>
        </div>
      </section>

    </main>
  );
}

export default Home;
