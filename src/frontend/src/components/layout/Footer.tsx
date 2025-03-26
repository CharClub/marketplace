import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <div className="flex w-full justify-center">
      <div className="flex w-full flex-col items-start justify-between bg-other-bg-0 p-4 sm:flex-row sm:items-center sm:px-8 lg:px-12 2xl:max-w-[1344px]">
        <h6 className="mb-3 text-sm font-medium leading-5 text-other-subtitle sm:mb-0">{`© CharClub AI ${new Date().getFullYear()}`}</h6>
        <div className="flex w-full justify-between gap-6 sm:w-auto">
          <div className="flex flex-col gap-3 sm:flex-row sm:gap-6">
            <h6>
              <Link
                to="https://charclub.ai/terms"
                className="text-sm font-medium leading-5 text-opacityColor-70"
              >
                Term of service
              </Link>
            </h6>
            <h6>
              <Link
                to="https://charclub.ai/privacy-policy"
                className="text-sm font-medium leading-5 text-opacityColor-70"
              >
                Privacy policy
              </Link>
            </h6>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:gap-6">
            <h6>
              <Link
                to="https://charclub.ai/faqs"
                className="text-sm font-medium leading-5 text-opacityColor-70"
              >
                FAQ
              </Link>
            </h6>
            <h6>
              <Link
                to="mailto:support@charclub.ai"
                className="text-sm font-medium leading-5 text-opacityColor-70"
              >
                Email support
              </Link>
            </h6>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Footer;
