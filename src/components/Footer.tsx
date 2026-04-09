function Footer() {
    return (
        <footer className="w-full bg-[var(--dark-blue)] text-[var(--white)] border-t border-blue-900">
            <div className="max-w-screen-xl mx-auto p-5 flex flex-col sm:flex-row justify-between items-center text-[10px] sm:text-xs gap-3 text-center sm:text-left">
                <p>Copyright © {new Date().getFullYear()} 02 Solutions.</p>
                <p>All Rights Reserved | Terms and Conditions | Privacy Policy</p>
            </div>
        </footer>
    )
}

export default Footer;