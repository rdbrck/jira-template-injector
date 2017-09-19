// eslint-disable-next-line no-unused-vars
class utils {
    static commonItemInArrays (array1, array2) {
        if (!array1 || !array2) {
            return null;
        }

        var commonItem = null;
        $.each(array1, function (index, value) {
            if ($.inArray(value, array2) !== -1) {
                commonItem = value;
                return false;
            }
        });
        return commonItem;
    }

    // Turn formatted projects field into an array of projects
    static parseProjects (projects) {
        if (!projects) {
            return [];
        }
        return projects.split(', ');
    }

    // Sorts an array of objects in place using a property of the objects
    static sortArrayByProperty (array, property) {
        return array.sort(function (a, b) {
            var propertyA = a[property];
            var propertyB = b[property];

            if (propertyA < propertyB) {
                return -1;
            } else if (propertyA > propertyB) {
                return 1;
            } else {
                return 0;
            }
        });
    }
}
