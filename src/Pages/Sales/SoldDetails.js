import React from 'react';
import SalesLeadDetail from './LeadDetail';

// Wrapper component so we can route sold details through /sales/sold/:id
// while reusing the exact same SalesLeadDetail UI/logic, but in "sold" view mode.
const SoldDetails = () => {
  return <SalesLeadDetail isSoldView />;
};

export default SoldDetails;


