import React, { ReactNode } from 'react'

export function CSVButton(): ReactNode {
    return (
        <div
            style={{
                height: '100%',
                cursor: 'pointer',
            }}
        >
            <img src="/csv.png" alt="CSV Export Button" style={{ height: '100%' }} />
        </div>
    )
}
