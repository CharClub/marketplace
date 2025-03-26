import MainLayout from "@charm/components/layout/MainLayout";
import CharacterDetailPage from "@charm/pages/CharacterDetail";
import ExplorePage from "@charm/pages/Explore";
import { LinkAccountPage } from "@charm/pages/LinkAccount";
import NotFoundPage from "@charm/pages/NotFound";
import { SettingsPage } from "@charm/pages/Setting";
import UserProfile from "@charm/pages/Users/page";
import { type RouteObject } from "react-router-dom";

const routes: Array<RouteObject> = [
  {
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: <ExplorePage />,
      },

      {
        path: "/settings",
        element: <SettingsPage />,
      },

      {
        path: "characters/:tokenId",
        element: <CharacterDetailPage />,
      },

      {
        path: "users/:address",
        element: <UserProfile />,
      },

      {
        path: "/connect/callback",
        element: <LinkAccountPage />,
      }
    ],
  },

  // 404 Route
  {
    path: "*",
    element: <NotFoundPage />,
  },
];

export default routes;
