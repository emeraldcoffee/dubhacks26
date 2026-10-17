class Dish:

    """
        name is a String.
        images is a list of String objects of image path files.
        rating is a float from 0.0-5.0 representing the rating a user gives the dish

    """
    def __init__(self, name, images, rating):
        self.name = name
        self.images = images
        self.rating = rating

    def add_image(self, image):
        self.images.append(image)

    def update_rating(self, rating):
        self.rating = rating

