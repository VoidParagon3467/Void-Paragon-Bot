import { AppSidebar } from "../AppSidebar";

export default function AppSidebarExample() {
  return (
    <AppSidebar 
      user={{
        name: "Vøid Pæragon",
        email: "paragon3467@gmail.com",
        role: "admin",
        avatar: "https://i.pravatar.cc/150?img=33",
        isPremium: true
      }}
    />
  );
}
