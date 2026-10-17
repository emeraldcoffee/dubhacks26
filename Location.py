import datetime

class Location:

    """
        name is a String.
        address is a String.
        visited is a boolean.
        dates_visited is a list of datetime.date(year, month, day) objects
        dishes is a list of Dish objects
    """
    def __init__(self, name, address, visited, dates_visited, dishes):
        self.name = name
        self.address = address
        self.visited = visited
        self.dates_visited = dates_visited
        self.dishes = dishes

    """
        date is a datetime.date(year, month, day)
        dishes_tried is a list of Dish objects that the user had during that visit
    """
    def visit(self, date, dishes_tried):
        if not visited:
            visited = True

        self.dates_vistied.append(date)
        self.dishes.append(dishes_tried)

        
