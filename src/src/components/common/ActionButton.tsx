import React, { useState, useEffect } from 'react';
import styles from './action-button.module.css';
import {
  Heart,
  CheckCircle2,
  Eye,
  XCircle,
  PlusCircle,
  Trophy,
} from 'lucide-react';

interface ActionButtonProps {
  type: 'todo' | 'done' | 'doing' | 'favorite' | 'abandoned' | 'platine';
  status: boolean;
  onClick?: () => void;
  unsettext?: string;
  settext?: string;
  size?: 'default' | 'long';
}

export const ActionButton: React.FC<ActionButtonProps> = ({
  type,
  status,
  onClick,
  unsettext,
  settext,
  size = 'default',
}) => {
  const [activated, setActivated] = useState(status);

  useEffect(() => {
    setActivated(status);
  }, [status]);

  const handleClick = () => {
    if (onClick) {
      onClick();
    }
  };

  return (
    <div
      className={`${styles.container} ${size === 'long' ? styles.containerLong : ''}`}
    >
      <button
        className={`${styles.button} ${activated ? styles.active : ''}
          ${type === 'todo' ? styles.todo : type === 'done' ? styles.done : type === 'doing' ? styles.doing : type === 'favorite' ? styles.favorite : type === 'abandoned' ? styles.abandoned : type === 'platine' ? styles.platine : ''}
          ${size === 'long' ? styles.fullWidth : ''}`}
        onClick={handleClick}
      >
        <span className={styles.iconContainer}>
          <div>
            {type === 'todo' ? (
              <PlusCircle className="h-5 w-5" />
            ) : type === 'done' ? (
              <CheckCircle2 className="h-5 w-5" />
            ) : type === 'doing' ? (
              <Eye className="h-5 w-5" />
            ) : type === 'favorite' ? (
              <Heart className="h-5 w-5" />
            ) : type === 'abandoned' ? (
              <XCircle className="h-5 w-5" />
            ) : type === 'platine' ? (
              <Trophy className="h-5 w-5" />
            ) : null}
          </div>
        </span>
      </button>
      <p className={styles.text}>
        <span>{activated ? settext : unsettext}</span>
      </p>
    </div>
  );
};

export default ActionButton;
