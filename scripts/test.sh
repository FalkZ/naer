# Check if Docker is installed
if ! command -v docker &>/dev/null; then
	echo "Docker is not installed. Please install Docker first."
	exit 1
fi

# Check if Docker daemon is running
if ! docker info &>/dev/null; then
	echo "Docker daemon is not running. Please start Docker first."
	exit 1
fi
# Remove existing container if it exists
docker rm -f naer-mongodb-test 2>/dev/null || true

# Create and run new container
docker run --name naer-mongodb-test -p 27811:27017 -d mongo:latest

vitest --run

docker rm -f naer-mongodb-test