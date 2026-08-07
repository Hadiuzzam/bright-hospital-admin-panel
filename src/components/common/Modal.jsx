import { X } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Modal({ open, title, children, onClose, size = '' }) {
  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <motion.div
        className={`modal-card ${size ? `modal-${size}` : ``}`}
        onClick={(event) => event.stopPropagation()}
        initial={{ opacity: 0, scale: 0.96, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.22 }}
      >
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose} type="button">
            <X size={18} />
          </button>
        </div>
        {children}
      </motion.div>
    </div>
  );
}
