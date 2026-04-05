const ClickArrowIcon = ({ className }: { className?: string }) => {
  return (
    <svg 
      className={className} 
      width="12" 
      height="12" 
      viewBox="0 0 12 12" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <path 
        d="M2.01846 2.34402C1.97808 2.25083 1.99873 2.14242 2.07055 2.07061C2.14236 1.99879 2.25076 1.97814 2.34396 2.01852L10.344 5.26852C10.4437 5.30916 10.5062 5.40915 10.4991 5.51664C10.4919 5.62412 10.4167 5.71495 10.3125 5.74202L7.25046 6.53202C6.89812 6.6226 6.62277 6.89737 6.53146 7.24952L5.74196 10.3125C5.71489 10.4168 5.62406 10.492 5.51657 10.4991C5.40908 10.5063 5.3091 10.4438 5.26846 10.344L2.01846 2.34402" 
        stroke="currentColor" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default ClickArrowIcon;
