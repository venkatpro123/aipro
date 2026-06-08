import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { MessageCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { CareerOSHome } from "../components/CareerOS/CareerOSHome";

export default function CareerOSPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/", { replace: true });
    }
  }, [user, loading, navigate]);

  if (loading || !user) return null;

  return (
    <>
      <CareerOSHome />
      {/* Floating Copilot Button */}
      <Link to="/copilot" style={{ textDecoration: "none" }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.2, type: "spring", stiffness: 300 }}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          style={{
            position: "fixed",
            bottom: 88,
            right: 20,
            width: 52,
            height: 52,
            borderRadius: "50%",
            background: "linear-gradient(135deg, var(--cyan) 0%, #7c3aed 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 24px rgba(0,212,255,0.35)",
            cursor: "pointer",
            zIndex: 40,
          }}
          title="Open Career Copilot"
        >
          <MessageCircle size={22} color="#000" strokeWidth={2.2} />
        </motion.div>
      </Link>
    </>
  );
}
