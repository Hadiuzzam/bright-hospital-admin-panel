import { motion } from 'framer-motion';

export default function StatCard({ title, value, subtitle, icon: Icon, tone = 'primary' }) {
  return (
    <motion.div
      className={`stat-card ${tone}`}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <div className="stat-icon-wrap">
        {Icon ? <Icon size={24} /> : null}
      </div>
      <div>
        <p>{title}</p>
        <h3>{value}</h3>
        {subtitle ? <span>{subtitle}</span> : null}
      </div>
    </motion.div>
  );
}
