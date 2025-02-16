type Maybe<T> = T | undefined;
type Ok<T> = [T, undefined?];
type Fail<E> = [undefined, E];
type Result<T, E> = Ok<T> | Fail<E>;
