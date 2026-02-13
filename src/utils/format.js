export const formatCurrency = (value) => {
    return 'R ' + parseFloat(value || 0).toFixed(2);
};

export const getStockClass = (quantity) => {
    if (quantity === 0) return 'out-of-stock';
    if (quantity <= 5) return 'low-stock';
    return '';
};
