import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const Pagination = ({ currentPage, hasPrev, hasNext }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const createPageUrl = (pageNumber) => {
    const params = new URLSearchParams(location.search);
    params.set("page", pageNumber.toString());
    navigate({ search: params.toString() });
  };

  return (
    <div className="mt-12 flex justify-between w-full">
      <button
        className="rounded-md primary-button text-white text-sm w-24 cursor-pointer disabled:cursor-not-allowed disabled:bg-pink-200"
        disabled={!hasPrev}
        onClick={() => createPageUrl(currentPage - 1)}
      >
        Previous
      </button>
      <button
        className="rounded-md primary-button text-white text-sm w-24 cursor-pointer disabled:cursor-not-allowed disabled:bg-pink-200"
        disabled={!hasNext}
        onClick={() => createPageUrl(currentPage + 1)}
      >
        Next
      </button>
    </div>
  );
};

export default Pagination;
