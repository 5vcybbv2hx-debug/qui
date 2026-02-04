import React from 'react';
import { FixedSizeList as List } from 'react-window';

export default function VirtualizedList({ 
    items, 
    height = 600, 
    itemHeight = 100, 
    renderItem,
    itemKey 
}) {
    const Row = ({ index, style }) => {
        const item = items[index];
        return (
            <div style={style}>
                {renderItem(item, index)}
            </div>
        );
    };

    return (
        <List
            height={height}
            itemCount={items.length}
            itemSize={itemHeight}
            width="100%"
            itemKey={itemKey || ((index) => items[index]?.id || index)}
        >
            {Row}
        </List>
    );
}