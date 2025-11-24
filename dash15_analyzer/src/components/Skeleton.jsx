import React from 'react';

const Skeleton = ({ className, ...props }) => {
    return (
        <div
            className={`animate-pulse bg-slate-800/50 rounded-lg ${className}`}
            {...props}
        />
    );
};

export { Skeleton };
