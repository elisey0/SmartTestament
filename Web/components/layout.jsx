import Navbar from "./navbar";
import Footer from "./footer";

export default function Layout({ selectedChain, children }) {
  return (
    <>
      <Navbar selectedChain={selectedChain} />
      <main>{children}</main>
      <Footer />
    </>
  );
}
