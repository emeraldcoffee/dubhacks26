class Quest:

    """
        address is a String.
        visited is a boolean.
        dates_visited is a list of datetime.date(year, month, day) objects
        dishes is a list of Dish objects
    """
    def __init__(self, locations, progress):
        self.locations = locations
        self.progress = progress
