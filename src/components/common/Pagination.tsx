import React, { useState } from "react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  className = "",
}) => {
  const [goToPage, setGoToPage] = useState("");

  const handlePrevious = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  const handleGoToPage = () => {
    const page = parseInt(goToPage);
    if (page >= 1 && page <= totalPages) {
      onPageChange(page);
      setGoToPage("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleGoToPage();
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        onClick={handlePrevious}
        disabled={currentPage <= 1}
        className="text-gray-40 text-xs"
      >
        {"<"}
      </button>

      <div className="w-auto px-2 h-[22px] flex items-center justify-center text-gray-40 text-xs border border-gray-40 rounded-md">
        {currentPage} / {totalPages}
      </div>

      <button
        onClick={handleNext}
        disabled={currentPage >= totalPages}
        className="text-gray-40 text-xs"
      >
        {">"}
      </button>

      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-40">Go to</span>
        <input
          type="number"
          value={goToPage}
          onChange={(e) => setGoToPage(e.target.value)}
          onKeyPress={handleKeyPress}
          min="1"
          max={totalPages}
          className="w-10 h-[22px] px-1 text-xs border border-gray-40 rounded-md text-gray-40 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
    </div>
  );
};

export default Pagination;
