import { NovelCard } from "../NovelCard";

export default function NovelCardExample() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
      <NovelCard
        id="1"
        title="Shadows of the Void"
        author="Vøid Pæragon"
        cover="https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400&h=600&fit=crop"
        genre="Fantasy"
        rating={4.8}
        views={125000}
        likes={8500}
        isPremium={true}
        status="ongoing"
        synopsis="In a world where darkness reigns, one hero must rise to challenge the ancient evil that threatens all existence."
        onRead={(id) => console.log(`Reading novel ${id}`)}
      />
      <NovelCard
        id="2"
        title="Code of Legends"
        author="Alex Chen"
        genre="Sci-Fi"
        rating={4.5}
        views={89000}
        likes={6200}
        status="completed"
        synopsis="A programmer discovers a hidden code that could change the fabric of reality itself."
        onRead={(id) => console.log(`Reading novel ${id}`)}
      />
      <NovelCard
        id="3"
        title="Romance in the Stars"
        author="Emma Rose"
        cover="https://images.unsplash.com/photo-1534447677768-be436bb09401?w=400&h=600&fit=crop"
        genre="Romance"
        rating={4.7}
        views={156000}
        likes={12000}
        status="ongoing"
        onRead={(id) => console.log(`Reading novel ${id}`)}
      />
    </div>
  );
}
